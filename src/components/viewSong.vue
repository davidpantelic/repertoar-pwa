<script setup lang="ts">
import type { SongView } from "@/types";

const { softDeleteSong, songsError } = useSongs();
const {
  lists,
  loadLists,
  getListsForSong,
  addSongToList,
  removeSongFromList,
  listsError,
  mutatingListSongs,
} = useLists();
const confirmDialog = useConfirm();
const toast = useToast();
const { t } = useI18n();
const emit = defineEmits(["songDeleted", "editSong"]);

const props = defineProps<{
  song: SongView;
}>();

const addToListDialogShown = ref(false);
const loadingListsForDialog = ref(false);
const pendingListIds = ref<string[]>([]);

const linkedLists = computed(() => getListsForSong(props.song.id));
const linkedListIds = computed(() => new Set(linkedLists.value.map((list) => list.id)));
const hasListSelectionChanges = computed(() => {
  const currentIds = [...linkedListIds.value].sort();
  const nextIds = [...pendingListIds.value].sort();

  if (currentIds.length !== nextIds.length) return true;
  return currentIds.some((listId, index) => listId !== nextIds[index]);
});

const openAddToListDialog = async () => {
  loadingListsForDialog.value = true;

  try {
    await loadLists();
    pendingListIds.value = [...linkedListIds.value];
    addToListDialogShown.value = true;
  } finally {
    loadingListsForDialog.value = false;
  }
};

const closeAddToListDialog = () => {
  addToListDialogShown.value = false;
  pendingListIds.value = [];
};

const saveSongListsSelection = async () => {
  const currentIds = new Set(linkedListIds.value);
  const nextIds = new Set(pendingListIds.value);

  const listIdsToAdd = pendingListIds.value.filter((listId) => !currentIds.has(listId));
  const listIdsToRemove = [...currentIds].filter((listId) => !nextIds.has(listId));

  for (const listId of listIdsToAdd) {
    const success = await addSongToList(listId, props.song.id);
    if (!success) {
      toast.removeGroup("addSongToListError");
      toast.add({
        group: "addSongToListError",
        severity: "error",
        summary: t("toasts.global.error.summary"),
        detail: t("toasts.global.error.detail"),
        life: 3000,
      });
      console.log("Error on adding song to list:", listsError.value);
      return;
    }
  }

  for (const listId of listIdsToRemove) {
    const success = await removeSongFromList(listId, props.song.id);
    if (!success) {
      toast.removeGroup("addSongToListError");
      toast.add({
        group: "addSongToListError",
        severity: "error",
        summary: t("toasts.global.error.summary"),
        detail: t("toasts.global.error.detail"),
        life: 3000,
      });
      console.log("Error on removing song from list:", listsError.value);
      return;
    }
  }

  if (listIdsToAdd.length > 0 || listIdsToRemove.length > 0) {
    toast.removeGroup("addSongToListSuccess");
    toast.add({
      group: "addSongToListSuccess",
      severity: "success",
      summary: t("api.changeSaved"),
      life: 2000,
    });
  }

  closeAddToListDialog();
};

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
      @click="openAddToListDialog"
    />
  </div>

  <Dialog
    v-model:visible="addToListDialogShown"
    modal
    :header="t('words.lists')"
  >
    <div class="flex flex-col gap-3 min-w-60">
      <div v-if="loadingListsForDialog" class="text-center">
        <i class="pi pi-spinner pi-spin text-2xl!" />
      </div>

      <template v-else-if="lists.length > 0">
        <div class="flex flex-col gap-2">
          <label
            v-for="list in lists"
            :key="list.id"
            class="flex items-center gap-3 rounded-md border border-surface-200 px-3 py-2 cursor-pointer"
          >
            <Checkbox v-model="pendingListIds" :inputId="list.id" :value="list.id" />
            <span>{{ list.name }}</span>
          </label>
        </div>

        <div class="flex gap-2 flex-wrap [&>button]:grow">
          <Button
            type="button"
            severity="danger"
            :label="t('words.cancel')"
            icon="pi pi-times"
            iconPos="right"
            size="small"
            @click="closeAddToListDialog"
          />
          <Button
            type="button"
            severity="primary"
            :label="t('words.save')"
            :icon="mutatingListSongs ? 'pi pi-spinner pi-spin' : 'pi pi-save'"
            iconPos="right"
            size="small"
            :disabled="mutatingListSongs || !hasListSelectionChanges"
            @click="saveSongListsSelection"
          />
        </div>
      </template>

      <p v-else class="text-center">{{ t("lists.noLists") }}</p>
    </div>

    <template #closebutton>
      <Button
        severity="secondary"
        size="small"
        icon="pi pi-times"
        variant="text"
        @click="closeAddToListDialog"
      />
    </template>
  </Dialog>

  <ConfirmDialog
    group="deleteSong"
    class="song-delete-confirm-dialog"
  ></ConfirmDialog>

  <Toast group="deleteSongError" />
  <Toast group="addSongToListError" />
  <Toast group="addSongToListSuccess" />
</template>
