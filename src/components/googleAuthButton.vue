<script setup lang="ts">
import { useUserSession } from "../stores/userSession";

const userSessionStore = useUserSession();
</script>

<template>
  <Button
    label="Google"
    variant="outlined"
    :icon="
      userSessionStore.googleSigning ? 'pi pi-spinner pi-spin' : 'pi pi-google'
    "
    icon-pos="right"
    fluid
    @click="() => void userSessionStore.signWithGoogle()"
  />
</template>
