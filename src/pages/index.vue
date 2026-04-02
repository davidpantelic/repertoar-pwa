<script setup lang="ts">
import type { WorkView } from "@/types";

const { t } = useI18n();

const views = computed(() => [
  {
    label: t("words.playlists"),
    value: "playlists-view" as const,
  },
  {
    label: t("words.songs"),
    value: "songs-view" as const,
  },
]);

const selectedView = ref<WorkView>("songs-view");
</script>

<template>
  <main class="h-svh flex flex-col">
    <SelectButton
      v-model="selectedView"
      :options="views"
      optionLabel="label"
      optionValue="value"
      :allowEmpty="false"
      fluid
      class="mb-3"
    />
    <div class="flex gap-3 justify-center flex-col items-center grow">
      <!-- SONGS view -->
      <div v-if="selectedView == 'songs-view'">
        <div class="text-center">
          <p>no song</p>
          <Button
            size="large"
            severity="primary"
            iconPos="left"
            icon="pi pi-plus"
            :label="$t('words.addSong')"
            class="mt-3"
            @click="console.log('sds')"
          />
        </div>
      </div>

      <!-- PLAYLISTS view -->
      <div v-if="selectedView == 'playlists-view'">
        <div class="text-center">
          <p>no playlist</p>
          <Button
            size="large"
            severity="primary"
            iconPos="left"
            icon="pi pi-plus"
            :label="$t('words.addPlaylist')"
            class="mt-3"
            @click="console.log('sds')"
          />
        </div>
      </div>
    </div>
  </main>
</template>
