<script setup lang="ts">
import { useUserSession } from "@/stores/userSession";
import type { Song, WorkView } from "@/types";

const userSession = useUserSession();
const subscriptionPlan = await userSession.getSubscriptionPlan();
const { t } = useI18n();
const { songs, loadSongs, loadingSongs, songsError } = useSongs();

const views = computed(() => [
  {
    label: t("words.lists"),
    value: "playlists-view" as const,
  },
  {
    label: t("words.songs"),
    value: "songs-view" as const,
  },
]);

const selectedView = ref<WorkView>("songs-view");

const showAddSongDialog = ref(false);

const onAddedSong = async () => {
  showAddSongDialog.value = false;
  await loadSongs();
};

const onDeletedSong = async () => {
  await loadSongs();
};

const onEditedSong = (updatedSong: Song) => {
  const existingIndex = songs.value.findIndex(
    (song) => song.id === updatedSong.id,
  );
  if (existingIndex === -1) return;

  songs.value.splice(existingIndex, 1, updatedSong);
};

onMounted(async () => {
  if (subscriptionPlan.trial || subscriptionPlan.basic) {
    await loadSongs();
  }
});
</script>

<template>
  <main class="h-svh flex flex-col max-w-150 mx-auto">
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
      <div
        class="flex gap-3 justify-center flex-col items-center grow mt-1"
        :class="songs.length > 0 ? 'h-full min-h-0' : ''"
      >
        <!-- SONGS view -->
        <template v-if="selectedView == 'songs-view'">
          <div
            class="text-center w-full"
            :class="songs.length > 0 ? 'mt-auto flex-1 min-h-0' : ''"
          >
            <i v-if="loadingSongs" class="pi pi-spinner pi-spin text-2xl!"></i>

            <SongsView
              v-else-if="songs.length > 0"
              :songs="songs"
              @song-edited="onEditedSong"
              @song-deleted="onDeletedSong"
            />

            <p v-else>{{ $t("songs.noSongs") }}</p>
          </div>

          <Button
            size="small"
            severity="primary"
            iconPos="left"
            icon="pi pi-plus"
            :label="$t('words.addSong')"
            :class="songs.length > 0 ? 'mt-auto self-end' : ''"
            @click="showAddSongDialog = true"
          />

          <Dialog
            v-model:visible="showAddSongDialog"
            modal
            :header="$t('words.addSong')"
          >
            <AddSong
              @cancel="showAddSongDialog = false"
              @success="onAddedSong"
            />
            <template #closebutton>
              <Button
                severity="secondary"
                size="small"
                icon="pi pi-times"
                variant="text"
                @click="showAddSongDialog = false"
              />
            </template>
          </Dialog>
        </template>

        <!-- PLAYLISTS view -->
        <template v-if="selectedView == 'playlists-view'">
          <div class="text-center">
            <p>no list</p>
            <Button
              size="small"
              severity="primary"
              iconPos="left"
              icon="pi pi-plus"
              :label="$t('words.addlist')"
              class="mt-3"
              @click="console.log('sds')"
            />
          </div>
        </template>
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
