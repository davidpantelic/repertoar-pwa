<script setup lang="ts">
import { useScrollPanelOverflow } from "@/composables/useScrollPanelOverflow";
import type { Playlist, ListView, PlaylistUpsertPayload } from "@/types";

const emit = defineEmits(["listDeleted", "listEdited"]);
const props = defineProps<{
  lists: Playlist[];
}>();

const { t } = useI18n();
const searchQuery = ref("");
const { scrollPanelWrapper, hasVerticalOverflow, scheduleOverflowMeasurement } =
  useScrollPanelOverflow();
const showSearch = computed(
  () => hasVerticalOverflow.value || searchQuery.value.length > 0,
);
const filteredLists = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return props.lists;

  return props.lists.filter((list) =>
    [list.name, list.note].some((value) =>
      value?.toLowerCase().includes(query),
    ),
  );
});

const openListDialogShown = ref(false);
const listToOpen = ref<ListView>();
const openList = (list: ListView) => {
  listToOpen.value = list;
  openListDialogShown.value = true;
};

const editMode = ref(false);
const listToEditId = ref<string>();
const listToEdit = ref<PlaylistUpsertPayload>();
const toggleEditMode = (listId: string, list: PlaylistUpsertPayload) => {
  listToEditId.value = listId;
  listToEdit.value = list;
  editMode.value = true;
};

const onEditedList = (updatedList: Playlist) => {
  listToOpen.value = {
    id: updatedList.id,
    name: updatedList.name,
    note: updatedList.note,
    songs_count: updatedList.songs_count,
  };
  listToEdit.value = {
    name: updatedList.name,
    note: updatedList.note,
  };
  editMode.value = false;
  emit("listEdited", updatedList);
};

watch(
  [() => props.lists, searchQuery],
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
        :placeholder="t('words.searchLists')"
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
          v-for="list in filteredLists"
          :key="list.id"
          class="lists-card grow min-w-0 text-left cursor-pointer hover:bg-emphasis! transition-colors mb-3"
          @click="
            openList({
              id: list.id,
              name: list.name,
              note: list.note,
              songs_count: list.songs_count,
            })
          "
        >
          <template #content>
            <span class="w-full text-sm sm:text-base">{{ list.name }}</span>

            <div class="flex gap-2 items-center text-muted-color italic">
              <span v-if="list.note" class="text-xs flex-1 truncate sm:text-sm">
                {{ list.note }}
              </span>
            </div>
          </template>
        </Card>

        <p
          v-if="filteredLists.length === 0"
          class="text-sm text-muted-color text-center"
        >
          {{ t("lists.noSearchResults") }}
        </p>
      </ScrollPanel>
    </div>
  </div>

  <Dialog
    class="list-view-dialog h-full"
    v-model:visible="openListDialogShown"
    modal
    header=" "
  >
    <div class="flex flex-col gap-4 h-full justify-between text-center">
      <EditList
        v-if="editMode && listToEdit && listToEditId"
        :list-id="listToEditId"
        :list="listToEdit"
        @success="onEditedList"
        @cancel="editMode = false"
      />

      <ViewList
        v-else-if="listToOpen"
        :list="listToOpen"
        @edit-list="toggleEditMode"
        @list-deleted="
          openListDialogShown = false;
          emit('listDeleted');
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
          openListDialogShown = false;
          editMode = false;
        "
      />
    </template>
  </Dialog>
</template>
