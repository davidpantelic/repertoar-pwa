<script setup lang="ts">
import type { SongView } from "@/types";

const { softDeleteSong, songsError } = useSongs();
const confirmDialog = useConfirm();
const toast = useToast();
const { t } = useI18n();
const emit = defineEmits(["songDeleted", "editSong"]);

const props = defineProps<{
  song: SongView;
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
        emit("songDeleted");
      }
    },
    reject: () => {},
  });
};
</script>

<template>
  <ScrollPanel class="min-h-0">
    <h2>{{ props.song?.name }}</h2>
    <p v-if="props.song?.artist" class="italic">
      {{ props.song?.artist }}
    </p>
    <p v-if="props.song?.note" class="mt-3 whitespace-pre-wrap">
      {{ props.song?.note }}
    </p>
  </ScrollPanel>
  <div class="flex gap-3 h-8.5">
    <Button
      severity="danger"
      size="small"
      icon="pi pi-trash"
      class="min-w-fit grow"
      @click="deleteSong(props.song!.id)"
    />
    <Button
      severity="secondary"
      variant="outlined"
      size="small"
      icon="pi pi-pen-to-square"
      class="min-w-fit grow"
      @click="
        emit('editSong', props.song!.id, {
          name: props.song!.name,
          artist: props.song?.artist,
          note: props.song?.note,
        })
      "
    />
    <Button
      severity="primary"
      size="small"
      icon="pi pi-plus"
      class="min-w-fit grow"
      @click="console.log('add song to playlist')"
    />
  </div>

  <ConfirmDialog
    group="deleteSong"
    class="song-delete-confirm-dialog"
  ></ConfirmDialog>

  <Toast group="deleteSongError" />
</template>
