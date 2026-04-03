import type { userCredentials, ChatProfile } from "@/types";

export const useUserSession = defineStore("userSession", () => {
  const isLoading = ref(false);
  const isResetPasswordRequestLoading = ref(false);
  const isLoggingOut = ref(false);
  const isLoggingOutOthers = ref(false);
  const isEditing = ref(false);
  const googleSigning = ref(false);
  const supabase = useSupabaseClient();
  const session = ref<any | null>(null);
  const sessionError = ref<any | null>(null);
  const { t, locale } = useI18n();
  const toast = useToast();
  let unsub: (() => void) | null = null;
  const clickCounter = ref(0);
  const loadingAllUsers = ref(false);
  const allUsers = ref<ChatProfile[]>([]);
  const currentProfile = ref<ChatProfile | null>(null);
  const router = useRouter();

  const getUserDisplayName = (user: any) => {
    const metadata = user?.user_metadata ?? {};
    return (
      metadata.display_name ?? metadata.full_name ?? metadata.name ?? "User"
    );
  };

  const getUserAvatarSource = (user: any) => {
    const metadata = user?.user_metadata ?? {};
    return (
      metadata.avatar_url ?? metadata.picture ?? metadata.photo_url ?? null
    );
  };

  const isGoogleUser = (user: any) => {
    if (!user) return false;

    const providers = (user.identities ?? []).map(
      (identity: any) => identity.provider,
    );

    return (
      providers.includes("google") || user.app_metadata?.provider === "google"
    );
  };

  const isStoredAvatarUrl = (avatarUrl?: string | null) =>
    Boolean(avatarUrl?.includes("/storage/v1/object/public/avatars/"));

  const syncCurrentProfile = async (
    user: any,
    overrides?: Partial<ChatProfile> & { lang?: string | null },
  ) => {
    if (!user?.id) return null;

    const profilePayload = {
      id: user.id,
      email: overrides?.email ?? user.email ?? null,
      display_name: overrides?.display_name ?? getUserDisplayName(user),
      avatar_url:
        overrides?.avatar_url ??
        currentProfile.value?.avatar_url ??
        getUserAvatarSource(user),
      lang: overrides?.lang ?? locale.value,
    };

    const { data, error } = await supabase
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" })
      .select("id, email, display_name, avatar_url")
      .single();

    if (error) throw error;

    currentProfile.value = data;
    return data;
  };

  const loadCurrentProfile = async () => {
    const userId = session.value?.user?.id;
    if (!userId) {
      currentProfile.value = null;
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, display_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;

    currentProfile.value = data ?? null;
    return currentProfile.value;
  };

  const cacheCurrentUserAvatar = async (user: any) => {
    if (!user?.id || !isGoogleUser(user)) return null;

    const sourceUrl = getUserAvatarSource(user);
    if (!sourceUrl) return currentProfile.value?.avatar_url ?? null;

    if (isStoredAvatarUrl(currentProfile.value?.avatar_url)) {
      return currentProfile.value?.avatar_url ?? null;
    }

    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch avatar: ${response.status}`);
    }

    const avatarBlob = await response.blob();
    const avatarContentType = avatarBlob.type || "image/jpeg";
    const avatarExtension = avatarContentType.includes("png")
      ? "png"
      : avatarContentType.includes("webp")
        ? "webp"
        : "jpg";
    const avatarPath = `${user.id}/avatar.${avatarExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(avatarPath, avatarBlob, {
        upsert: true,
        contentType: avatarContentType,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(avatarPath);

    await syncCurrentProfile(user, { avatar_url: publicUrl });
    return publicUrl;
  };

  const hydrateCurrentUserProfile = async (user: any) => {
    if (!user?.id) {
      currentProfile.value = null;
      return null;
    }

    await loadCurrentProfile();

    if (!currentProfile.value) {
      await syncCurrentProfile(user);
    }

    if (isGoogleUser(user)) {
      try {
        await cacheCurrentUserAvatar(user);
      } catch (error) {
        console.warn("Failed to cache Google avatar", error);
      }
    }

    return currentProfile.value;
  };

  function isSessionAlreadyGone(err: any) {
    const code = err?.code ?? err?.error?.code;
    const msg = String(err?.message ?? err);
    return (
      code === "session_not_found" ||
      msg.includes("session_not_found") ||
      msg.includes("Auth session missing")
    );
  }

  const checkSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error(error);
        session.value = null;
        sessionError.value = error;
        return;
      }

      // If there's a session locally, confirm it's valid on server
      if (data.session) {
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userRes?.user) {
          await logOut("global", { silent: true });
          session.value = null;
          sessionError.value = userErr ?? null;
          return;
        }

        if (
          !data.session.user.new_email &&
          data.session.user.email !== data.session.user.user_metadata.email
        ) {
          const { error } = await supabase.auth.updateUser({
            data: {
              email: data.session.user.email,
            },
          });
          if (error) console.log(error);
        }
      }

      session.value = data.session ?? null;
      sessionError.value = null;
      await hydrateCurrentUserProfile(session.value?.user);
    } catch (err) {
      console.error(err);
      session.value = null;
      sessionError.value = err;
      currentProfile.value = null;
    }
  };

  let forceLogoutChannel: ReturnType<typeof supabase.channel> | null = null;

  const stopForceLogoutListener = () => {
    if (!forceLogoutChannel) return;
    void supabase.removeChannel(forceLogoutChannel);
    forceLogoutChannel = null;
  };

  const startForceLogoutListener = (userId: string) => {
    stopForceLogoutListener();

    forceLogoutChannel = supabase
      .channel(`force-logout-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "auth_events",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          if (payload.new?.type !== "force_logout") return;

          // logout this device immediately
          await logOut("local", { silent: true });
        },
      )
      .subscribe();
  };

  const signWithGoogle = async () => {
    googleSigning.value = true;

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/google-auth-confirmation`,
        },
      });

      if (error) {
        console.log(error);

        toast.removeGroup("userSignToastGroup");
        toast.add({
          group: "userSignToastGroup",
          severity: "warn",
          summary: t("googleAuth.failedSigning"),
          life: 4000,
        });
        return;
      }
    } catch (err) {
      console.log(err);
    } finally {
      googleSigning.value = false;
    }
  };

  const signUpNewUser = async (
    credentials: userCredentials["register"],
  ): Promise<boolean> => {
    isLoading.value = true;
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimLowerString(credentials.email),
        password: credentials.password,
        options: {
          data: {
            lang: locale.value, // "en" / "sr"
            display_name: credentials.username?.trim() || "no_name",
          },
          emailRedirectTo: `${window.location.origin}/auth-confirmation?redirect_to_home=true`,
        },
      });

      // console.log(data);

      if (error) {
        const detail =
          error.code === "over_email_send_rate_limit"
            ? t("form.message.registerFailedEmailRateLimit")
            : error.message;

        toast.add({
          group: "userSignToastGroup",
          severity: "warn",
          summary: t("form.message.registerFailed"),
          detail,
          life: 3000,
        });
        return false;
      }

      toast.add({
        group: "userSignToastGroup",
        severity: "success",
        summary: t("form.message.registerSuccess"),
        detail: t("form.message.registerSuccessMessage"),
        life: 8000,
      });
      return true;
    } catch (err) {
      toast.add({
        group: "userSignToastGroup",
        severity: "error",
        summary: t("form.message.registerFailed"),
        detail: String(err),
        life: 3000,
      });
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const updateUserLang = async (): Promise<boolean> => {
    if (!session.value?.user) return false;
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          lang: locale.value,
        },
      });
      if (error) {
        console.warn("Failed to update user language metadata", error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("Failed to update user language metadata", err);
      return false;
    }
  };

  const logWithPass = async (
    credentials: userCredentials["login"],
  ): Promise<boolean> => {
    isLoading.value = true;
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimLowerString(credentials.email),
        password: credentials.password,
      });

      if (error) {
        let detail = error.message;

        if (error.code === "invalid_credentials") {
          detail = t("form.message.loginFailedWrongCredentials");
        } else if (error.code === "email_not_confirmed") {
          detail = t("form.message.loginFailedUnverifiedEmail");
        }

        toast.add({
          group: "userSignToastGroup",
          severity: "warn",
          summary: t("form.message.loginFailed"),
          detail,
          life: 5000,
        });
        return false;
      }

      toast.add({
        group: "userSignToastGroup",
        severity: "success",
        summary: t("form.message.loginSuccess"),
        life: 3000,
      });
      // router.push({ path: "/" });
      return true;

      // await checkSession();
    } catch (err) {
      toast.add({
        group: "userSignToastGroup",
        severity: "error",
        summary: t("form.message.loginFailed"),
        detail: String(err),
        life: 3000,
      });
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const logOut = async (
    logOutScope: "local" | "global" | "others" | undefined = "local",
    options?: { silent?: boolean },
  ) => {
    isLoggingOut.value = logOutScope === "local";
    isLoggingOutOthers.value = logOutScope === "others";
    const silent = options?.silent === true;
    const isOthersLogout = logOutScope === "others";
    const currentUserId = session.value?.user?.id;

    // Prevent consuming our own force-logout event before remote revoke finishes.
    if (isOthersLogout) {
      stopForceLogoutListener();
    }

    try {
      if (isOthersLogout && currentUserId) {
        await supabase.from("auth_events").insert({
          user_id: currentUserId,
          type: "force_logout",
        });
      }

      // If you DON'T need "logout all devices", keep local scope:
      const { error } = await supabase.auth.signOut({ scope: logOutScope }); // local

      if (error) {
        // If session is already gone server-side, still treat as success
        if (isSessionAlreadyGone(error)) {
          session.value = null;
          sessionError.value = null;
          currentProfile.value = null;

          if (!silent) {
            toast.add({
              group: "userSignToastGroup",
              severity: "info",
              summary: t("form.message.logoutSuccess"),
              life: 3000,
            });
          }
          router.push({ path: "/login" });
          return;
        }

        if (!silent) {
          toast.add({
            group: "userSignToastGroup",
            severity: "error",
            summary: t("form.message.logoutFailed"),
            detail: error.message,
            life: 3000,
          });
        }

        if (isOthersLogout && session.value?.user?.id) {
          startForceLogoutListener(session.value.user.id);
        }
        return;
      }

      // Normal success
      if (isOthersLogout) {
        // Keep this device logged in; only other sessions should be revoked.
        if (currentUserId) {
          startForceLogoutListener(currentUserId);
        }

        toast.add({
          group: "userSignToastGroup",
          severity: "info",
          summary: t("form.message.logoutSuccess"),
          detail: t("form.message.logoutOthersSuccess"),
          life: 3000,
        });
      } else {
        session.value = null;
        sessionError.value = null;
        currentProfile.value = null;
      }

      if (!silent) {
        toast.add({
          group: "userSignToastGroup",
          severity: "info",
          summary: t("form.message.logoutSuccess"),
          life: 3000,
        });
        router.push({ path: "/login" });
      }
    } catch (err: any) {
      // Same: treat missing session as success
      if (isSessionAlreadyGone(err)) {
        session.value = null;
        sessionError.value = null;
        currentProfile.value = null;

        if (!silent) {
          toast.add({
            group: "userSignToastGroup",
            severity: "secondary",
            summary: t("form.message.logoutSuccess"),
            life: 3000,
          });
        }
        router.push({ path: "/login" });
        return;
      }

      if (!silent) {
        toast.add({
          group: "userSignToastGroup",
          severity: "error",
          summary: t("form.message.logoutFailed"),
          detail: String(err),
          life: 3000,
        });
      }

      if (isOthersLogout && session.value?.user?.id) {
        startForceLogoutListener(session.value.user.id);
      }
    } finally {
      isLoggingOut.value = false;
      isLoggingOutOthers.value = false;
    }
  };

  const initAuthListener = () => {
    if (unsub) return;

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!newSession) {
        stopForceLogoutListener();
        session.value = null;
        sessionError.value = null;
        currentProfile.value = null;
        return;
      }

      session.value = newSession;
      sessionError.value = null;
      startForceLogoutListener(newSession.user.id);
      void hydrateCurrentUserProfile(newSession.user);

      // optional: keep your existing background validation
      setTimeout(() => {
        void checkSession();
      }, 0);
    });

    unsub = () => {
      stopForceLogoutListener();
      data.subscription.unsubscribe();
    };
  };

  const updateUserData = async (
    credentials: userCredentials["edit"],
  ): Promise<boolean> => {
    if (!session.value?.user) return false;

    isEditing.value = true;

    try {
      const user = session.value.user;
      const metadata = user.user_metadata ?? {};

      const nextUsername = (credentials.username ?? "").trim();
      const nextEmail = trimLowerString(credentials.email ?? "");

      const currentUsername =
        [metadata.display_name, metadata.full_name, metadata.name]
          .find((v) => typeof v === "string" && v.trim().length > 0)
          ?.trim() ?? "";

      const currentEmail = trimLowerString(user.email ?? "");

      const usernameChanged = currentUsername !== nextUsername;
      const emailChanged = currentEmail !== nextEmail;

      if (!usernameChanged && !emailChanged) {
        clickCounter.value =
          clickCounter.value > 5 ? 4 : clickCounter.value + 1;
        return false;
      }

      const updateUserInfo = {
        email: nextEmail,
        data: {
          lang: locale.value,
          name: nextUsername,
          full_name: nextUsername,
          display_name: nextUsername,
        },
      };

      const { error } = await supabase.auth.updateUser(updateUserInfo, {
        emailRedirectTo: `${window.location.origin}/email-changed`,
      });

      if (error) {
        console.error(error);

        if (error.code == "over_email_send_rate_limit") {
          clickCounter.value = 0;

          toast.add({
            group: "resetPasswordRequestToastGroup",
            severity: "warn",
            summary: t("userEdit.editFailedTitle"),
            detail: t("userEdit.editFailedOverLimit"),
            life: 6000,
          });
        } else {
          toast.add({
            group: "resetPasswordRequestToastGroup",
            severity: "warn",
            summary: t("userEdit.editFailedTitle"),
            life: 6000,
          });
        }

        return false;
      }

      // Keep public profile in sync for features that read from profiles table (e.g. chat).
      const { error: profileSyncError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: nextEmail,
            display_name: nextUsername,
            avatar_url:
              currentProfile.value?.avatar_url ??
              getUserAvatarSource(user) ??
              null,
            lang: locale.value,
          },
          { onConflict: "id" },
        );
      if (profileSyncError) {
        console.warn(
          "Profile sync failed after auth.updateUser",
          profileSyncError,
        );
      } else {
        currentProfile.value = {
          id: user.id,
          email: nextEmail,
          display_name: nextUsername,
          avatar_url:
            currentProfile.value?.avatar_url ??
            getUserAvatarSource(user) ??
            null,
        };
      }

      toast.add({
        group: "resetPasswordRequestToastGroup",
        severity: "success",
        summary: t("userEdit.editSuccessfulTitle"),
        detail: emailChanged ? t("userEdit.editSuccessfulTextEmail") : "",
        life: 6000,
      });

      return true;
    } catch (err) {
      console.log(err);
      return false;
    } finally {
      isEditing.value = false;
    }
  };

  const resetPasswordRequest = async () => {
    isResetPasswordRequestLoading.value = true;

    // Non-blocking best effort: keep email language metadata updated for templates.
    void updateUserLang();

    try {
      const email = session.value?.user?.email;
      if (!email) {
        toast.add({
          group: "resetPasswordRequestToastGroup",
          severity: "warn",
          summary: t("resetPasswordRequest.requestFailTitle"),
          detail: t("resetPasswordRequest.requestFailMessage"),
          life: 5000,
        });
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/password-reset`,
      });

      if (error) {
        console.error(error);

        toast.add({
          group: "resetPasswordRequestToastGroup",
          severity: "warn",
          summary: t("resetPasswordRequest.requestFailTitle"),
          detail: t("resetPasswordRequest.requestFailMessage"),
          life: 5000,
        });

        return;
      }

      toast.add({
        group: "resetPasswordRequestToastGroup",
        severity: "success",
        summary: t("resetPasswordRequest.requestTitle"),
        detail: t("resetPasswordRequest.requestMessage"),
        life: 10000,
      });
    } catch (err) {
      console.error(err);
    } finally {
      isResetPasswordRequestLoading.value = false;
    }
  };

  const updateUserPassword = async (new_password: string): Promise<boolean> => {
    isLoading.value = true;

    try {
      const { error } = await supabase.auth.updateUser({
        password: new_password,
        data: {
          lang: locale.value,
        },
      });

      if (error) {
        console.error(error);

        if (error.code == "same_password") {
          toast.add({
            group: "resetPasswordRequestToastGroup",
            severity: "warn",
            summary: t("resetPasswordRequest.failedChangeTitle"),
            detail: t("resetPasswordRequest.failedChangeText"),
            life: 6000,
          });
        }

        return false;
      }

      toast.add({
        group: "resetPasswordRequestToastGroup",
        severity: "success",
        summary: t("resetPasswordRequest.successfulChange"),
        detail: t("resetPasswordRequest.successfulChangeText"),
        life: 6000,
      });
      return true;
    } catch (err) {
      console.error(err);
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const getAllUsers = async () => {
    loadingAllUsers.value = true;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", session.value.user.id)
        .order("created_at", { ascending: true });

      allUsers.value = data ?? [];
    } catch (err) {
      console.error(err);
    } finally {
      loadingAllUsers.value = false;
    }
  };

  const getSubscriptionPlan = async () => {
    const { data, error } = await supabase
      .from("subscription_plan")
      .select("*")
      .single();

    if (error) throw error;
    return data;
  };

  return {
    isLoading,
    isResetPasswordRequestLoading,
    isLoggingOut,
    isLoggingOutOthers,
    isEditing,
    googleSigning,
    signWithGoogle,
    supabase,
    checkSession,
    session,
    sessionError,
    signUpNewUser,
    logWithPass,
    logOut,
    initAuthListener,
    updateUserData,
    resetPasswordRequest,
    updateUserPassword,
    clickCounter,
    getAllUsers,
    allUsers,
    currentProfile,
    loadCurrentProfile,
    getSubscriptionPlan,
  };
});
