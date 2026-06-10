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
const addSongsSearchQuery = ref("");
const songPreviewDialogShown = ref(false);
const selectedSongIndex = ref(0);
const songPreviewScrollWrapper = ref<HTMLElement | null>(null);
const songPreviewHasMoreBelow = ref(false);

const currentSongIdsInList = computed(() =>
  songsInList.value.map((song) => song.id),
);
const hasSongSelectionChanges = computed(() => {
  const currentIds = [...currentSongIdsInList.value].sort();
  const nextIds = [...pendingSongIds.value].sort();

  if (currentIds.length !== nextIds.length) return true;
  return currentIds.some((songId, index) => songId !== nextIds[index]);
});
const filteredSongsForAdd = computed(() => {
  const query = addSongsSearchQuery.value.trim().toLowerCase();
  if (!query) return songs.value;

  return songs.value.filter((song) =>
    [song.name, song.artist].some((value) =>
      value?.toLowerCase().includes(query),
    ),
  );
});
const selectedSong = computed(() => songsInList.value[selectedSongIndex.value]);
const hasPreviousSong = computed(() => selectedSongIndex.value > 0);
const hasNextSong = computed(
  () => selectedSongIndex.value < songsInList.value.length - 1,
);

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

      if (songsInList.value.length < 1) {
        reorderMode.value = false;
      }
    },
    reject: () => {},
  });
};

const moveSongInCurrentList = async (
  songId: string,
  direction: "up" | "down",
) => {
  const currentIndex = songsInList.value.findIndex(
    (song) => song.id === songId,
  );
  if (currentIndex === -1) return;

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= songsInList.value.length) return;

  const nextSongs = [...songsInList.value];
  const [movedSong] = nextSongs.splice(currentIndex, 1);
  if (!movedSong) return;
  nextSongs.splice(targetIndex, 0, movedSong);

  const orderedSongIds = nextSongs.map((song) => song.id);
  const reorderedEntries = await reorderSongsInList(
    props.list.id,
    orderedSongIds,
  );

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

const openSongPreview = (index: number) => {
  if (reorderMode.value) return;

  selectedSongIndex.value = index;
  songPreviewDialogShown.value = true;
};

const getSongPreviewScrollContent = () =>
  songPreviewScrollWrapper.value?.querySelector<HTMLElement>(
    ".p-scrollpanel-content",
  ) ?? null;

const updateSongPreviewFade = (event?: Event) => {
  const content = (event?.target as HTMLElement | null)?.classList.contains(
    "p-scrollpanel-content",
  )
    ? (event?.target as HTMLElement)
    : getSongPreviewScrollContent();

  if (!content) {
    songPreviewHasMoreBelow.value = false;
    return;
  }

  songPreviewHasMoreBelow.value =
    content.scrollHeight - content.scrollTop - content.clientHeight > 1;
};

const resetSongPreviewScroll = async () => {
  await nextTick();
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const content = getSongPreviewScrollContent();
  if (content) content.scrollTop = 0;
  updateSongPreviewFade();
};

const showPreviousSong = async () => {
  if (!hasPreviousSong.value) return;
  selectedSongIndex.value -= 1;
  await resetSongPreviewScroll();
};

const showNextSong = async () => {
  if (!hasNextSong.value) return;
  selectedSongIndex.value += 1;
  await resetSongPreviewScroll();
};

const openAddSongsDialog = async () => {
  loadingSongsForAddDialog.value = true;
  addSongsSearchQuery.value = "";

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
  addSongsSearchQuery.value = "";
};

const saveListSongsSelection = async () => {
  const currentIds = new Set(currentSongIdsInList.value);
  const nextIds = new Set(pendingSongIds.value);

  const songIdsToAdd = pendingSongIds.value.filter(
    (songId) => !currentIds.has(songId),
  );
  const songIdsToRemove = [...currentIds].filter(
    (songId) => !nextIds.has(songId),
  );

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

const reorderMode = ref(false);
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

    <div
      v-else-if="songsInList.length > 0"
      class="flex flex-col gap-2 text-left p-1 bg-emphasis rounded-lg"
    >
      <Card
        v-for="(song, index) in songsInList"
        :key="song.id"
        class="lists-card min-w-0"
        :class="!reorderMode ? 'cursor-pointer' : ''"
        @click="openSongPreview(index)"
      >
        <template #content>
          <div class="flex gap-3 items-center">
            <Button
              v-if="reorderMode"
              severity="danger"
              variant="text"
              size="small"
              icon="pi pi-times"
              :disabled="mutatingListSongs"
              @click.stop="confirmRemoveSongFromCurrentList(song.id)"
            />

            <div class="min-w-0 flex-1">
              <span class="w-full text-sm sm:text-base">{{ song.name }}</span>

              <div class="flex gap-2 items-center text-muted-color italic">
                <span v-if="song.artist" class="text-xs sm:text-sm">
                  {{ song.artist }}
                </span>

                <span v-if="song.artist && song.note" class="leading-none"
                  >-</span
                >

                <span
                  v-if="song.note"
                  class="text-xs flex-1 truncate sm:text-sm"
                >
                  {{ song.note }}
                </span>
              </div>
            </div>

            <div v-if="reorderMode" class="flex flex-col gap-2">
              <Button
                severity="secondary"
                variant="outlined"
                size="small"
                class="p-1!"
                icon="pi pi-chevron-up"
                :disabled="mutatingListSongs || index === 0"
                @click.stop="moveSongInCurrentList(song.id, 'up')"
              />
              <Button
                severity="secondary"
                variant="outlined"
                size="small"
                class="p-1!"
                icon="pi pi-chevron-down"
                :disabled="
                  mutatingListSongs || index === songsInList.length - 1
                "
                @click.stop="moveSongInCurrentList(song.id, 'down')"
              />
            </div>
          </div>
        </template>
      </Card>
    </div>

    <p v-else class="mt-3 text-sm text-muted-color text-center">
      {{ $t("songs.noSongs") }}
    </p>
  </ScrollPanel>
  <div class="flex gap-2 h-8.5">
    <Button
      severity="danger"
      size="small"
      icon="pi pi-trash"
      class="min-w-fit grow"
      :disabled="reorderMode"
      @click="deleteList(props.list!.id)"
    />
    <Button
      severity="secondary"
      variant="outlined"
      size="small"
      icon="pi pi-pen-to-square"
      class="min-w-fit grow"
      :disabled="reorderMode"
      @click="
        emit('editList', props.list!.id, {
          name: props.list!.name,
          note: props.list?.note,
        })
      "
    />
    <Button
      v-if="songsInList.length > 0"
      :severity="reorderMode ? 'primary' : 'secondary'"
      variant="outlined"
      size="small"
      icon="pi pi-arrow-right-arrow-left"
      class="min-w-fit grow [&>span]:rotate-90"
      @click="reorderMode = !reorderMode"
    />
    <Button
      severity="primary"
      size="small"
      icon="pi pi-plus"
      class="min-w-fit grow"
      :disabled="reorderMode"
      @click="openAddSongsDialog"
    />
  </div>

  <Dialog
    v-model:visible="songPreviewDialogShown"
    modal
    class="h-full [&_.p-dialog-header]:pb-0!"
    :header="props.list?.name"
    @show="resetSongPreviewScroll"
  >
    <div
      v-if="selectedSong"
      class="flex items-stretch flex-col gap-2 w-full h-full"
    >
      <div
        ref="songPreviewScrollWrapper"
        class="relative min-h-0 grow overflow-hidden"
        @scroll.capture="updateSongPreviewFade"
      >
        <ScrollPanel class="h-full">
          <div class="min-w-0 text-center">
            <h2>{{ selectedSong.name }}</h2>
            <p v-if="selectedSong.artist" class="italic">
              {{ selectedSong.artist }}
            </p>
            <p v-if="selectedSong.note" class="mt-3 whitespace-pre-wrap">
              {{ selectedSong.note }}
            </p>
          </div>
        </ScrollPanel>

        <div
          class="song-preview-bottom-fade"
          :class="{
            'song-preview-bottom-fade-visible': songPreviewHasMoreBelow,
          }"
          aria-hidden="true"
        />
      </div>

      <div class="flex w-full gap-3">
        <Button
          severity="secondary"
          variant="outlined"
          icon="pi pi-chevron-left"
          class="grow"
          size="small"
          :disabled="!hasPreviousSong"
          @click="showPreviousSong"
        />
        <Button
          severity="secondary"
          variant="outlined"
          icon="pi pi-chevron-right"
          class="grow"
          size="small"
          :disabled="!hasNextSong"
          @click="showNextSong"
        />
      </div>
    </div>
  </Dialog>

  <Dialog
    v-model:visible="addSongsDialogShown"
    class="h-full [&_.p-dialog-header]:pb-0!"
    modal
    :header="props.list?.name"
  >
    <div class="flex flex-col gap-3 min-w-60 h-full">
      <div v-if="loadingSongsForAddDialog" class="text-center">
        <i class="pi pi-spinner pi-spin text-2xl!" />
      </div>

      <template v-else-if="songs.length > 0">
        <p class="mb-2">{{ t("words.addSongsInList") }}</p>

        <IconField class="shrink-0">
          <InputIcon class="pi pi-search" />
          <InputText
            v-model="addSongsSearchQuery"
            :placeholder="t('words.searchSongs')"
            class="pr-10!"
            fluid
          />
          <button
            v-if="addSongsSearchQuery"
            type="button"
            class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-color hover:text-color"
            :aria-label="t('words.clearSearch')"
            @click="addSongsSearchQuery = ''"
          >
            <i class="pi pi-times" aria-hidden="true" />
          </button>
        </IconField>

        <ScrollPanel class="min-h-0 grow">
          <div class="flex flex-col gap-2">
            <label
              v-for="song in filteredSongsForAdd"
              :key="song.id"
              class="flex items-center gap-3 rounded-md border border-surface px-3 py-2 cursor-pointer"
            >
              <Checkbox
                v-model="pendingSongIds"
                :inputId="song.id"
                :value="song.id"
              />
              <div class="min-w-0 flex-1">
                <span class="block text-sm sm:text-base truncate">{{
                  song.name
                }}</span>
                <!-- <div class="flex gap-2 items-center text-muted-color italic">
                  <span v-if="song.artist" class="text-xs sm:text-sm">
                    {{ song.artist }}
                  </span>

                  <span v-if="song.artist && song.note" class="leading-none"
                    >-</span
                  >

                  <span
                    v-if="song.note"
                    class="text-xs flex-1 truncate sm:text-sm"
                  >
                    {{ song.note }}
                  </span>
                </div> -->
              </div>
            </label>

            <p
              v-if="filteredSongsForAdd.length === 0"
              class="text-sm text-muted-color text-center"
            >
              {{ t("songs.noSearchResults") }}
            </p>
          </div>
        </ScrollPanel>

        <div class="flex gap-2 flex-wrap mt-auto [&>button]:grow">
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
