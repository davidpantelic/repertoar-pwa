<script setup lang="ts">
import type { SongUpsertPayload } from "@/types";
import { zodResolver } from "@primevue/forms/resolvers/zod";
import { z } from "zod";

const { creatingSong, createSong, songsError } = useSongs();
const { t, locale } = useI18n();
const toast = useToast();
const emit = defineEmits(["cancel", "success"]);

const initialValues = ref<SongUpsertPayload>({
  name: "",
  artist: "",
  note: "",
});

const buildSchema = () =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, { message: t("songs.validation.missingName") })
      .max(60, { message: t("songs.validation.tooLongName") }),
    artist: z
      .string()
      .trim()
      .max(30, { message: t("songs.validation.tooLongArtist") })
      .optional(),
    note: z
      .string()
      .trim()
      .max(1000, { message: t("songs.validation.tooLongNote") })
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
    const payload: SongUpsertPayload = {
      ...e.values,
    };

    // console.log(payload);
    // return;

    const success = await createSong(payload);
    if (!success) {
      toast.removeGroup("addSongError");
      toast.add({
        group: "addSongError",
        severity: "warn",
        summary: t("toasts.global.error.summary"),
        detail: t("toasts.global.error.detail"),
        life: 3000,
      });
      console.log("Error on adding song:", songsError.value);
    }
    if (success) emit("success");
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
</script>

<template>
  <Form
    v-slot="$form"
    :initialValues
    :resolver="resolverRef"
    class="flex flex-col gap-4 w-full"
    @submit="onFormSubmit"
    @reset="onFormReset"
  >
    <div class="flex-wrap gap-y-1">
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

    <div class="flex-wrap gap-y-1">
      <InputText
        name="artist"
        id="artist"
        type="text"
        :placeholder="t('words.artist')"
        fluid
      />
      <Message
        v-if="$form.artist?.invalid"
        class="w-full"
        severity="error"
        size="small"
        variant="simple"
        >{{ $form.artist.error.message }}</Message
      >
    </div>

    <div class="flex-wrap gap-y-1">
      <Textarea
        name="note"
        id="note"
        :placeholder="t('words.note')"
        fluid
        rows="5"
        cols="30"
      />
      <Message
        v-if="$form.note?.invalid"
        class="w-full"
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
      />
      <Button
        type="submit"
        severity="primary"
        :label="t('words.save')"
        :icon="creatingSong ? 'pi pi-spinner pi-spin' : 'pi pi-save'"
        iconPos="right"
        :disabled="creatingSong"
      />
    </div>
  </Form>

  <Toast group="addSongError" />
</template>
