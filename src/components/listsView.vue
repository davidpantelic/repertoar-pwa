<script setup lang="ts">
import type { Playlist, ListView, PlaylistUpsertPayload } from "@/types";

const emit = defineEmits(["listDeleted", "listEdited"]);
const props = defineProps<{
  lists: Playlist[];
}>();

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
</script>

<template>
  <ScrollPanel class="w-full h-full">
    <Card
      v-for="list in props.lists"
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
  </ScrollPanel>

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
