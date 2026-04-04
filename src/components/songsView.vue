<script setup lang="ts">
import type { Song, SongView, SongUpsertPayload } from "@/types";

const { softDeleteSong, songsError } = useSongs();
const confirmDialog = useConfirm();
const { t } = useI18n();
const toast = useToast();
const emit = defineEmits(["songDeleted", "songEdited"]);
const props = defineProps<{
  songs: Song[];
}>();

const deleteSong = async (songId: string) => {
  if (!songId) return;

  confirmDialog.require({
    group: "deleteSong",
    message: t("songs.deleteSongConfirm"),
    // header: t("dialogs.updateDialogConfirm.header"),

    rejectProps: {
      label: t("words.no"),
      severity: "secondary",
      outlined: true,
    },
    acceptProps: {
      severity: "danger",
      label: t("words.delete"),
    },
    accept: async () => {
      const success = await softDeleteSong(songId);
      if (!success) {
        toast.removeGroup("deleteSongError");
        toast.add({
          group: "deleteSongError",
          severity: "error",
          summary: t("toasts.global.error.summary"),
          detail: t("toasts.global.error.detail"),
          life: 3000,
        });
        console.log("Error on adding song:", songsError.value);
      }
      if (success) {
        openSongDialogShown.value = false;
        emit("songDeleted");
      }
    },
    reject: () => {},
  });
};

const openSongDialogShown = ref(false);
const openSongObj = ref<SongView>();
const openSong = (song: SongView) => {
  openSongObj.value = song;
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
  openSongObj.value = {
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
    class="song-view-dialog max-w-150 h-full w-[calc(100%-20px)]!"
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

      <template v-else>
        <ScrollPanel class="min-h-0">
          <h2>{{ openSongObj?.name }}</h2>
          <h3 v-if="openSongObj?.artist" class="italic">
            {{ openSongObj?.artist }}
          </h3>
          <p v-if="openSongObj?.note" class="mt-3 whitespace-pre-wrap">
            {{ openSongObj?.note }}
          </p>
        </ScrollPanel>
        <div class="flex gap-3">
          <Button
            severity="danger"
            size="small"
            icon="pi pi-trash"
            class="min-w-fit grow"
            @click="deleteSong(openSongObj!.id)"
          />
          <Button
            severity="secondary"
            variant="outlined"
            size="small"
            icon="pi pi-pen-to-square"
            class="min-w-fit grow"
            @click="
              toggleEditMode(openSongObj!.id, {
                name: openSongObj!.name,
                artist: openSongObj?.artist,
                note: openSongObj?.note,
              })
            "
          />
          <Button
            severity="primary"
            size="small"
            icon="pi pi-plus"
            class="min-w-fit grow"
            @click="deleteSong(openSongObj!.id)"
          />
        </div>
      </template>
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

  <ConfirmDialog
    group="deleteSong"
    class="song-delete-confirm-dialog"
  ></ConfirmDialog>

  <Toast group="deleteSongError" />
</template>
