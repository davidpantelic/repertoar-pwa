<script setup lang="ts">
import { useUserSession } from "../stores/userSession";

const userSessionStore = useUserSession();
</script>

<template>
  <Button
    type="button"
    severity="danger"
    :label="$t('words.logoutOthers')"
    :icon="
      userSessionStore.isLoggingOutOthers
        ? 'pi pi-spin pi-spinner'
        : 'pi pi-sign-out'
    "
    icon-pos="right"
    @click="userSessionStore.logOut('others', { silent: true })"
  />
</template>
