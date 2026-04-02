<script setup lang="ts">
import { useMainStore } from "../stores/mainStore";

const mainStore = useMainStore();
const { t } = useI18n();

const openProfileDialog = () => {
  mainStore.profileDialogShow = true;
};
</script>

<template>
  <main class="text-center">
    <div class="max-w-lg md:max-w-xl mx-auto">
      <h1>{{ $t("words.welcome") }}</h1>

      <p class="mt-2">
        {{ $t("appInfo.description") }}
      </p>

      <p class="mt-2">
        {{ $t("welcomePage.loginText") }}
      </p>

      <br />

      <Button
        type="submit"
        icon="pi pi-sign-in"
        iconPos="right"
        :label="t('words.login')"
        @click="openProfileDialog"
      />
    </div>
  </main>
</template>
