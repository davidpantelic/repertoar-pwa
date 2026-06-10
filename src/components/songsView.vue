<script setup lang="ts">
import { useScrollPanelOverflow } from "@/composables/useScrollPanelOverflow";
import type { Song, SongView, SongUpsertPayload } from "@/types";

const emit = defineEmits(["songDeleted", "songEdited"]);
const props = defineProps<{
  songs: Song[];
}>();

const { t } = useI18n();
const searchQuery = ref("");
const { scrollPanelWrapper, hasVerticalOverflow, scheduleOverflowMeasurement } =
  useScrollPanelOverflow();
const showSearch = computed(
  () => hasVerticalOverflow.value || searchQuery.value.length > 0,
);
const filteredSongs = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return props.songs;

  return props.songs.filter((song) =>
    [song.name, song.artist].some((value) =>
      value?.toLowerCase().includes(query),
    ),
  );
});

const openSongDialogShown = ref(false);
const songToOpen = ref<SongView>();
const openSong = (song: SongView) => {
  songToOpen.value = song;
  openSongDialogShown.value = true;
};

const editMode = ref(false);
const songToEditId = ref<string>();
const songToEdit = ref<SongUpsertPayload>();
const toggleEditMode = (songId: string, song: SongUpsertPayload) => {
  songToEditId.value = songId;
  songToEdit.value = song;
  editMode.value = true;
};

const onEditedSong = (updatedSong: Song) => {
  songToOpen.value = {
    id: updatedSong.id,
    name: updatedSong.name,
    artist: updatedSong.artist,
    note: updatedSong.note,
  };
  songToEdit.value = {
    name: updatedSong.name,
    artist: updatedSong.artist,
    note: updatedSong.note,
  };
  editMode.value = false;
  emit("songEdited", updatedSong);
};

watch(
  [() => props.songs, searchQuery],
  () => {
    void scheduleOverflowMeasurement();
  },
  { deep: true, flush: "post" },
);
</script>

<template>
  <div class="flex flex-col gap-2 w-full h-full min-h-0">
    <IconField v-if="showSearch" class="shrink-0">
      <InputIcon class="pi pi-search" />
      <InputText
        v-model="searchQuery"
        :placeholder="t('words.searchSongs')"
        class="pr-10!"
        fluid
      />
      <button
        v-if="searchQuery"
        type="button"
        class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-color hover:text-color"
        :aria-label="t('words.clearSearch')"
        @click="searchQuery = ''"
      >
        <i class="pi pi-times" aria-hidden="true" />
      </button>
    </IconField>

    <div ref="scrollPanelWrapper" class="grow min-h-0">
      <ScrollPanel class="w-full h-full">
        <Card
          v-for="song in filteredSongs"
          :key="song.id"
          class="songs-card grow min-w-0 text-left cursor-pointer hover:bg-emphasis! transition-colors mb-3"
          @click="
            openSong({
              id: song.id,
              name: song.name,
              artist: song.artist,
              note: song.note,
            })
          "
        >
          <template #content>
            <span class="w-full text-sm sm:text-base">{{ song.name }}</span>

            <div class="flex gap-2 items-center text-muted-color italic">
              <span v-if="song.artist" class="text-xs sm:text-sm">
                {{ song.artist }}
              </span>

              <span v-if="song.artist && song.note" class="leading-none"
                >-</span
              >

              <span v-if="song.note" class="text-xs flex-1 truncate sm:text-sm">
                {{ song.note }}
              </span>
            </div>
          </template>
        </Card>

        <p
          v-if="filteredSongs.length === 0"
          class="text-sm text-muted-color text-center"
        >
          {{ t("songs.noSearchResults") }}
        </p>
      </ScrollPanel>
    </div>
  </div>

  <Dialog
    class="song-view-dialog h-full"
    v-model:visible="openSongDialogShown"
    modal
    header=" "
  >
    <div class="flex flex-col gap-4 h-full justify-between text-center">
      <EditSong
        v-if="editMode && songToEdit && songToEditId"
        :song-id="songToEditId"
        :song="songToEdit"
        @success="onEditedSong"
        @cancel="editMode = false"
      />

      <ViewSong
        v-else-if="songToOpen"
        :song="songToOpen"
        @edit-song="toggleEditMode"
        @song-deleted="
          openSongDialogShown = false;
          emit('songDeleted');
        "
      />
    </div>

    <template #closebutton>
      <Button
        severity="secondary"
        size="small"
        icon="pi pi-times"
        variant="text"
        @click="
          openSongDialogShown = false;
          editMode = false;
        "
      />
    </template>
  </Dialog>
</template>
