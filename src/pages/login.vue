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
    <div class="max-w-lg mx-auto">
      <h1>{{ $t("words.welcome") }}</h1>
      <br />
      <p>
        Da biste koristili Repertoar prijavite se na vaš korisnički nalog
        (najlakše uraditi sa Google nalogom) klikom na dugme ispod.
      </p>
      <p>Probni period od 10 dana vas čeka!</p>
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
