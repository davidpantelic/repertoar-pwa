<script setup lang="ts">
import type { Song, SongView, SongUpsertPayload } from "@/types";

const emit = defineEmits(["songDeleted", "songEdited"]);
const props = defineProps<{
  songs: Song[];
}>();

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
</script>

<template>
  <ScrollPanel class="w-full h-full">
    <Card
      v-for="song in props.songs"
      :key="song.id"
      class="songs-list grow min-w-0 text-left cursor-pointer hover:bg-emphasis! transition-colors mb-3"
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

          <span v-if="song.artist && song.note" class="leading-none">-</span>

          <span v-if="song.note" class="text-xs flex-1 truncate sm:text-sm">
            {{ song.note }}
          </span>
        </div>
      </template>
    </Card>
  </ScrollPanel>

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
