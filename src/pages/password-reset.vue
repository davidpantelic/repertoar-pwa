<script setup lang="ts">
import type { userCredentials } from "@/types";
import { zodResolver } from "@primevue/forms/resolvers/zod";
import { z } from "zod";
import { useUserSession } from "../stores/userSession";

const userSessionStore = useUserSession();
const { t, locale } = useI18n();
const toast = useToast();
const router = useRouter();
const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
const hashError = hash.get("error");
const isEvaluatingAccess = ref(true);
const recoveryLinkInvalid = ref(!!hashError);
const transientCheckError = ref(false);
const hasRecoveryToken =
  hash.has("access_token") ||
  hash.has("refresh_token") ||
  hash.get("type") === "recovery";
const showCheckingRecovery = computed(
  () => isEvaluatingAccess.value && hasRecoveryToken && !hashError,
);

const initialValues = ref<userCredentials["passwordReset"]>({
  password: "",
  passwordConfirm: "",
});

const buildSchema = () =>
  z
    .object({
      password: z
        .string()
        .min(1, { message: t("form.validation.passwordRequired") })
        .min(6, { message: t("form.validation.passwordMinLength") }),
      passwordConfirm: z
        .string()
        .min(1, { message: t("form.validation.passwordConfirmRequired") }),
    })
    .superRefine(({ password, passwordConfirm }, ctx) => {
      if (password !== passwordConfirm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["passwordConfirm"],
          message: t("form.validation.passwordMismatch"),
        });
      }
    });

const evaluateAccess = async () => {
  try {
    if (hashError) {
      recoveryLinkInvalid.value = true;
      transientCheckError.value = false;
      return;
    }

    if (!hasRecoveryToken) {
      recoveryLinkInvalid.value = true;
      transientCheckError.value = false;
      return;
    }

    const { data, error } = await userSessionStore.supabase.auth.getSession();
    if (error) {
      transientCheckError.value = true;
      recoveryLinkInvalid.value = false;
      return;
    }
    transientCheckError.value = false;
    recoveryLinkInvalid.value = !data.session;
  } catch {
    transientCheckError.value = true;
    recoveryLinkInvalid.value = false;
  } finally {
    isEvaluatingAccess.value = false;

    if (recoveryLinkInvalid.value) {
      toast.add({
        group: "resetPasswordRequestToastGroup",
        severity: "warn",
        summary: t("resetPasswordRequest.invalidOrExpiredLinkTitle"),
        detail: t("resetPasswordRequest.invalidOrExpiredLinkText"),
        life: 6000,
      });
      router.push({ path: "/" });
    } else if (transientCheckError.value) {
      toast.add({
        group: "resetPasswordRequestToastGroup",
        severity: "warn",
        summary: t("resetPasswordRequest.temporaryCheckFailedTitle"),
        detail: t("resetPasswordRequest.temporaryCheckFailedText"),
        life: 6000,
      });
    }
  }
};

onMounted(() => {
  void evaluateAccess();
});

const onFormSubmit = async (e: any): Promise<void> => {
  // e.originalEvent: Represents the native form submit event.
  // e.valid: A boolean that indicates whether the form is valid or not.
  // e.states: Contains the current state of each form field, including validity status.
  // e.errors: An object that holds any validation errors for the invalid fields in the form.
  // e.values: An object containing the current values of all form fields.
  // e.reset: A function that resets the form to its initial state.

  if (!e.valid || recoveryLinkInvalid.value) return;

  const isSuccess = await userSessionStore.updateUserPassword(
    e.values.password,
  );

  if (isSuccess) {
    e.reset();
    await userSessionStore.logOut("global", { silent: true });
    setTimeout(() => {
      router.push({ path: "/" });
    }, 6000);
  }
};

const resolverRef = ref(zodResolver(buildSchema()));

watch(
  () => locale.value,
  () => {
    resolverRef.value = zodResolver(buildSchema());
  },
);
</script>

<template>
  <main class="text-center">
    <h1>{{ $t("resetPasswordRequest.pageTitle") }}</h1>
    <br />

    <Message v-if="showCheckingRecovery" severity="info" variant="simple">
      {{ $t("resetPasswordRequest.checkingLink") }}
    </Message>

    <Message v-else-if="transientCheckError" severity="warn" variant="simple">
      {{ $t("resetPasswordRequest.temporaryCheckFailedText") }}
    </Message>

    <Form
      v-else-if="
        !isEvaluatingAccess && !recoveryLinkInvalid && !transientCheckError
      "
      v-slot="$form"
      :initialValues
      :resolver="resolverRef"
      @submit="onFormSubmit"
      class="flex flex-col gap-4 w-full xs:w-72 mx-auto"
    >
      <div class="flex flex-col gap-1 text-left">
        <Password
          name="password"
          id="password"
          :placeholder="t('form.fields.newPassword')"
          :feedback="false"
          toggleMask
          fluid
        />
        <Message
          v-if="$form.password?.invalid"
          severity="error"
          size="small"
          variant="simple"
        >
          <ul class="my-0 flex flex-col gap-1">
            <li v-for="(error, index) of $form.password.errors" :key="index">
              {{ error.message }}
            </li>
          </ul>
        </Message>
      </div>
      <div class="flex flex-col gap-1">
        <Password
          name="passwordConfirm"
          id="passwordConfirm"
          :placeholder="t('form.fields.newPasswordConfirm')"
          :feedback="false"
          toggleMask
          fluid
        />
        <Message
          v-if="$form.passwordConfirm?.invalid"
          severity="error"
          size="small"
          variant="simple"
        >
          <ul class="my-0 flex flex-col gap-1">
            <li
              v-for="(error, index) of $form.passwordConfirm.errors"
              :key="index"
            >
              {{ error.message }}
            </li>
          </ul>
        </Message>
      </div>
      <Button
        type="submit"
        severity="secondary"
        size="small"
        :label="t('words.resetPassword')"
      />
    </Form>
  </main>
</template>
