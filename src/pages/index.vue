<script setup lang="ts">
import { useUserSession } from "@/stores/userSession";
import type { WorkView } from "@/types";

const userSession = useUserSession();
const subscriptionPlan = await userSession.getSubscriptionPlan();
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
    <template v-if="subscriptionPlan.trial || subscriptionPlan.basic">
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
    </template>

    <template v-else>
      <div class="text-center">
        <h1>{{ $t("subscription.trialEnd") }}</h1>
        <p class="my-2">{{ $t("subscription.contactMe") }}</p>
        <a href="mailto:info@webdak.rs" class="hover:underline"
          ><strong>info@webdak.rs</strong></a
        >
      </div>
    </template>
  </main>
</template>
