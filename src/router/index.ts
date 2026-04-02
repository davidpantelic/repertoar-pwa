import { createRouter, createWebHistory } from "vue-router";
import { routes } from "vue-router/auto-routes";
import { useUserSession } from "@/stores/userSession";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

const publicPaths = [
  "/login",
  "/auth-confirmation",
  "/google-auth-confirmation",
  "/password-reset",
  "/privacy",
  "/terms",
];

router.beforeEach(async (to) => {
  if (publicPaths.includes(to.path)) return true;

  const userSession = useUserSession();

  if (!userSession.session) {
    await userSession.checkSession();
  }

  if (!userSession.session) {
    return {
      path: "/login",
      query: { redirect: to.fullPath },
    };
  }

  return true;
});

export default router;
