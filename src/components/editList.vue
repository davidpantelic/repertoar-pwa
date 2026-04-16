<script setup lang="ts">
import type { Playlist, PlaylistUpsertPayload } from "@/types";
import { zodResolver } from "@primevue/forms/resolvers/zod";
import { z } from "zod";

const { updatingList, renameList, listsError } = useLists();
const { t, locale } = useI18n();
const toast = useToast();
const emit = defineEmits(["cancel", "success"]);
const props = defineProps<{
  list: PlaylistUpsertPayload;
  listId: string;
}>();

const initialValues = ref<PlaylistUpsertPayload>({
  name: props.list.name,
  note: props.list.note || "",
});

const buildSchema = () =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, { message: t("lists.validation.missingName") })
      .max(60, { message: t("lists.validation.tooLongName") }),
    artist: z
      .string()
      .trim()
      .max(30, { message: t("lists.validation.tooLongArtist") })
      .optional(),
    note: z
      .string()
      .trim()
      .max(1300, { message: t("lists.validation.tooLongNote") })
      .optional(),
  });

const onFormSubmit = async (e: any): Promise<void> => {
  // e.originalEvent: Represents the native form submit event.
  // e.valid: A boolean that indicates whether the form is valid or not.
  // e.states: Contains the current state of each form field, including validity status.
  // e.errors: An object that holds any validation errors for the invalid fields in the form.
  // e.values: An object containing the current values of all form fields.
  // e.reset: A function that resets the form to its initial state.

  if (e.valid) {
    const payload: PlaylistUpsertPayload = {
      ...e.values,
    };

    // console.log(payload);
    // return;

    const updatedList = await renameList(props.listId, payload);
    if (!updatedList) {
      toast.removeGroup("editListError");
      toast.add({
        group: "editListError",
        severity: "warn",
        summary: t("toasts.global.error.summary"),
        detail: t("toasts.global.error.detail"),
        life: 3000,
      });
      console.log("Error on adding list:", listsError.value);
    }
    if (updatedList) emit("success", updatedList as Playlist);
  }
};

const resolverRef = ref(zodResolver(buildSchema()));

watch(
  () => locale.value,
  () => {
    resolverRef.value = zodResolver(buildSchema());
  },
);

const onFormReset = () => {
  emit("cancel");
};

const normalizeValues = (values: PlaylistUpsertPayload) => ({
  name: values.name.trim(),
  note: values.note?.trim() || "",
});

const initialNormalizedValues = computed(() =>
  normalizeValues({
    name: props.list.name,
    note: props.list.note || "",
  }),
);

const hasChanges = (values: PlaylistUpsertPayload) => {
  const normalized = normalizeValues(values);

  return (
    normalized.name !== initialNormalizedValues.value.name ||
    normalized.note !== initialNormalizedValues.value.note
  );
};
</script>

<template>
  <Form
    v-slot="$form"
    :initialValues
    :resolver="resolverRef"
    class="flex flex-col gap-2 w-full h-full"
    @submit="onFormSubmit"
    @reset="onFormReset"
  >
    <div class="flex-col gap-y-1">
      <InputText
        name="name"
        id="name"
        type="text"
        :placeholder="t('words.name')"
        fluid
      />
      <Message
        v-if="$form.name?.invalid"
        class="w-full"
        severity="error"
        size="small"
        variant="simple"
        >{{ $form.name.error.message }}</Message
      >
    </div>

    <div class="flex flex-col gap-y-1 grow">
      <Textarea
        name="note"
        id="note"
        :placeholder="t('words.note')"
        fluid
        rows="5"
        cols="30"
        class="flex-1 min-h-0 max-h-full!"
      />
      <Message
        v-if="$form.note?.invalid"
        class="w-full h-fit"
        severity="error"
        size="small"
        variant="simple"
        >{{ $form.note.error.message }}</Message
      >
    </div>

    <div class="flex gap-2 flex-wrap [&>button]:grow">
      <Button
        type="reset"
        severity="danger"
        :label="t('words.cancel')"
        icon="pi pi-times"
        iconPos="right"
        size="small"
      />
      <Button
        type="submit"
        severity="primary"
        :label="t('words.save')"
        :icon="updatingList ? 'pi pi-spinner pi-spin' : 'pi pi-save'"
        iconPos="right"
        :disabled="
          updatingList ||
          !hasChanges({
            name: $form.name?.value || '',
            note: $form.note?.value || '',
          })
        "
        size="small"
      />
    </div>
  </Form>

  <Toast group="editListError" />
</template>
