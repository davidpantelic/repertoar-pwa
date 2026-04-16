<script setup lang="ts">
import type { ListView, Song } from "@/types";

const { songs, loadSongs } = useSongs();
const {
  softDeleteList,
  listsError,
  loadLists,
  getSongsForList,
  addSongToList,
  removeSongFromList,
  reorderSongsInList,
  mutatingListSongs,
} = useLists();
const confirmDialog = useConfirm();
const toast = useToast();
const { t } = useI18n();
const emit = defineEmits(["listDeleted", "editList"]);

const props = defineProps<{
  list: ListView;
}>();

const songsInList = ref<Song[]>([]);
const loadingSongsInList = ref(false);
const addSongsDialogShown = ref(false);
const loadingSongsForAddDialog = ref(false);
const pendingSongIds = ref<string[]>([]);

const currentSongIdsInList = computed(() => songsInList.value.map((song) => song.id));
const hasSongSelectionChanges = computed(() => {
  const currentIds = [...currentSongIdsInList.value].sort();
  const nextIds = [...pendingSongIds.value].sort();

  if (currentIds.length !== nextIds.length) return true;
  return currentIds.some((songId, index) => songId !== nextIds[index]);
});

const loadSongsInCurrentList = async () => {
  if (!props.list?.id) {
    songsInList.value = [];
    return;
  }

  loadingSongsInList.value = true;

  try {
    await loadLists({ sync: false });
    songsInList.value = await getSongsForList(props.list.id);
  } finally {
    loadingSongsInList.value = false;
  }
};

const confirmRemoveSongFromCurrentList = (songId: string) => {
  confirmDialog.require({
    group: "removeSongFromList",
    message: t("lists.removeSongConfirm"),
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
      const success = await removeSongFromList(props.list.id, songId);

      if (!success) {
        toast.removeGroup("listSongMutationError");
        toast.add({
          group: "listSongMutationError",
          severity: "error",
          summary: t("toasts.global.error.summary"),
          detail: t("toasts.global.error.detail"),
          life: 3000,
        });
        console.log("Error on removing song from list:", listsError.value);
        return;
      }

      await loadSongsInCurrentList();
    },
    reject: () => {},
  });
};

const moveSongInCurrentList = async (songId: string, direction: "up" | "down") => {
  const currentIndex = songsInList.value.findIndex((song) => song.id === songId);
  if (currentIndex === -1) return;

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= songsInList.value.length) return;

  const nextSongs = [...songsInList.value];
  const [movedSong] = nextSongs.splice(currentIndex, 1);
  nextSongs.splice(targetIndex, 0, movedSong);

  const orderedSongIds = nextSongs.map((song) => song.id);
  const reorderedEntries = await reorderSongsInList(props.list.id, orderedSongIds);

  if (reorderedEntries.length === 0) {
    toast.removeGroup("listSongMutationError");
    toast.add({
      group: "listSongMutationError",
      severity: "error",
      summary: t("toasts.global.error.summary"),
      detail: t("toasts.global.error.detail"),
      life: 3000,
    });
    console.log("Error on reordering songs in list:", listsError.value);
    return;
  }

  songsInList.value = nextSongs;
};

const openAddSongsDialog = async () => {
  loadingSongsForAddDialog.value = true;

  try {
    await Promise.all([loadSongs(), loadSongsInCurrentList()]);
    pendingSongIds.value = [...currentSongIdsInList.value];
    addSongsDialogShown.value = true;
  } finally {
    loadingSongsForAddDialog.value = false;
  }
};

const closeAddSongsDialog = () => {
  addSongsDialogShown.value = false;
  pendingSongIds.value = [];
};

const saveListSongsSelection = async () => {
  const currentIds = new Set(currentSongIdsInList.value);
  const nextIds = new Set(pendingSongIds.value);

  const songIdsToAdd = pendingSongIds.value.filter((songId) => !currentIds.has(songId));
  const songIdsToRemove = [...currentIds].filter((songId) => !nextIds.has(songId));

  for (const songId of songIdsToAdd) {
    const success = await addSongToList(props.list.id, songId);
    if (!success) {
      toast.removeGroup("listSongMutationError");
      toast.add({
        group: "listSongMutationError",
        severity: "error",
        summary: t("toasts.global.error.summary"),
        detail: t("toasts.global.error.detail"),
        life: 3000,
      });
      console.log("Error on adding song to list:", listsError.value);
      return;
    }
  }

  for (const songId of songIdsToRemove) {
    const success = await removeSongFromList(props.list.id, songId);
    if (!success) {
      toast.removeGroup("listSongMutationError");
      toast.add({
        group: "listSongMutationError",
        severity: "error",
        summary: t("toasts.global.error.summary"),
        detail: t("toasts.global.error.detail"),
        life: 3000,
      });
      console.log("Error on removing song from list:", listsError.value);
      return;
    }
  }

  await loadSongsInCurrentList();
  closeAddSongsDialog();
};

watch(
  () => props.list?.id,
  () => {
    void loadSongsInCurrentList();
  },
  { immediate: true },
);

const deleteList = async (listId: string) => {
  if (!listId) return;

  confirmDialog.require({
    group: "deleteList",
    message: t("lists.deleteListConfirm"),
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
      const success = await softDeleteList(listId);
      if (!success) {
        toast.removeGroup("deleteListError");
        toast.add({
          group: "deleteListError",
          severity: "error",
          summary: t("toasts.global.error.summary"),
          detail: t("toasts.global.error.detail"),
          life: 3000,
        });
        console.log("Error on adding list:", listsError.value);
      }
      if (success) {
        emit("listDeleted");
      }
    },
    reject: () => {},
  });
};
</script>

<template>
  <ScrollPanel class="min-h-0">
    <h2>{{ props.list?.name }}</h2>
    <p v-if="props.list?.note" class="mt-3 whitespace-pre-wrap">
      {{ props.list?.note }}
    </p>

    <Divider />

    <div v-if="loadingSongsInList" class="text-center py-4">
      <i class="pi pi-spinner pi-spin text-2xl!" />
    </div>

    <div v-else-if="songsInList.length > 0" class="flex flex-col gap-2 text-left">
      <Card
        v-for="(song, index) in songsInList"
        :key="song.id"
        class="lists-card min-w-0"
      >
        <template #content>
          <div class="flex gap-3 items-start">
            <div class="flex flex-col gap-1">
              <Button
                severity="secondary"
                variant="text"
                size="small"
                icon="pi pi-chevron-up"
                :disabled="mutatingListSongs || index === 0"
                @click="moveSongInCurrentList(song.id, 'up')"
              />
              <Button
                severity="secondary"
                variant="text"
                size="small"
                icon="pi pi-chevron-down"
                :disabled="mutatingListSongs || index === songsInList.length - 1"
                @click="moveSongInCurrentList(song.id, 'down')"
              />
            </div>

            <div class="min-w-0 flex-1">
              <span class="w-full text-sm sm:text-base">{{ song.name }}</span>

              <div class="flex gap-2 items-center text-muted-color italic">
                <span v-if="song.artist" class="text-xs sm:text-sm">
                  {{ song.artist }}
                </span>

                <span v-if="song.artist && song.note" class="leading-none">-</span>

                <span
                  v-if="song.note"
                  class="text-xs flex-1 truncate sm:text-sm"
                >
                  {{ song.note }}
                </span>
              </div>
            </div>

            <Button
              severity="danger"
              variant="text"
              size="small"
              icon="pi pi-times"
              :disabled="mutatingListSongs"
              @click="confirmRemoveSongFromCurrentList(song.id)"
            />
          </div>
        </template>
      </Card>
    </div>

    <p v-else class="mt-3 text-sm text-muted-color text-left">
      {{ $t("songs.noSongs") }}
    </p>
  </ScrollPanel>
  <div class="flex gap-3 h-8.5">
    <Button
      severity="danger"
      size="small"
      icon="pi pi-trash"
      class="min-w-fit grow"
      @click="deleteList(props.list!.id)"
    />
    <Button
      severity="secondary"
      variant="outlined"
      size="small"
      icon="pi pi-pen-to-square"
      class="min-w-fit grow"
      @click="
        emit('editList', props.list!.id, {
          name: props.list!.name,
          note: props.list?.note,
        })
      "
    />
    <Button
      severity="primary"
      size="small"
      icon="pi pi-plus"
      class="min-w-fit grow"
      @click="openAddSongsDialog"
    />
  </div>

  <Dialog
    v-model:visible="addSongsDialogShown"
    modal
    :header="t('words.addSong')"
  >
    <div class="flex flex-col gap-3 min-w-60">
      <div v-if="loadingSongsForAddDialog" class="text-center">
        <i class="pi pi-spinner pi-spin text-2xl!" />
      </div>

      <template v-else-if="songs.length > 0">
        <div class="flex flex-col gap-2 max-h-90 overflow-auto">
          <label
            v-for="song in songs"
            :key="song.id"
            class="flex items-start gap-3 rounded-md border border-surface-200 px-3 py-2 cursor-pointer"
          >
            <Checkbox
              v-model="pendingSongIds"
              :inputId="song.id"
              :value="song.id"
            />
            <div class="min-w-0 flex-1">
              <span class="block text-sm sm:text-base">{{ song.name }}</span>
              <div class="flex gap-2 items-center text-muted-color italic">
                <span v-if="song.artist" class="text-xs sm:text-sm">
                  {{ song.artist }}
                </span>

                <span v-if="song.artist && song.note" class="leading-none">-</span>

                <span
                  v-if="song.note"
                  class="text-xs flex-1 truncate sm:text-sm"
                >
                  {{ song.note }}
                </span>
              </div>
            </div>
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
            @click="closeAddSongsDialog"
          />
          <Button
            type="button"
            severity="primary"
            :label="t('words.save')"
            :icon="mutatingListSongs ? 'pi pi-spinner pi-spin' : 'pi pi-save'"
            iconPos="right"
            size="small"
            :disabled="mutatingListSongs || !hasSongSelectionChanges"
            @click="saveListSongsSelection"
          />
        </div>
      </template>

      <p v-else class="text-center">{{ t("songs.noSongs") }}</p>
    </div>

    <template #closebutton>
      <Button
        severity="secondary"
        size="small"
        icon="pi pi-times"
        variant="text"
        @click="closeAddSongsDialog"
      />
    </template>
  </Dialog>

  <ConfirmDialog
    group="deleteList"
    class="list-delete-confirm-dialog"
  ></ConfirmDialog>
  <ConfirmDialog
    group="removeSongFromList"
    class="song-delete-confirm-dialog"
  ></ConfirmDialog>

  <Toast group="deleteListError" />
  <Toast group="listSongMutationError" />
</template>
