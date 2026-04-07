<script setup lang="ts">
import type { FormValues, FormErrors } from "@/types";

const model = ref("");

const { t } = useI18n();
const toast = useToast();

const show = () => {
  toast.add({
    severity: "info",
    summary: "Test",
    detail: "Test",
    life: 3000,
  });
};

const initialValues = reactive({
  username: "",
});

const resolver = ({ values }: { values: FormValues }) => {
  const errors: FormErrors = {};

  if (!values.username) {
    errors.username = [{ message: t("form.validation.usernameRequired") }];
  }

  return {
    values, // (Optional) Used to pass current form values to submit event.
    errors,
  };
};

const onFormSubmit = ({ valid }: { valid: boolean }) => {
  if (valid) {
    toast.add({
      severity: "success",
      summary: t("words.hello"),
      detail: initialValues.username,
      life: 3000,
    });
  }
};
</script>

<template>
  <main>
    <h1>Repertoar <span class="text-3xl">v36</span></h1>
    <p v-tooltip="$d(new Date('2026-01-14'), 'numeric')" class="w-fit">
      {{ $t("words.started") }}:
      <ArkFormatRelativeTime :value="new Date('2026-01-14')" />
    </p>
    <br />
    <h2>{{ $t("words.hello") }}</h2>
    <p>{{ $d(new Date(), "time") }}</p>
    <p>{{ $d(new Date(), "short") }}</p>
    <p>{{ $d(new Date(), "long") }}</p>
    <p>{{ $d(new Date(), "numeric") }}</p>
    <i18n-d scope="global" tag="p" :value="new Date()"></i18n-d>
    <p>{{ $n(10000, "currency") }}</p>
    <i18n-n scope="global" tag="p" :value="100" format="currency"></i18n-n>
    <br />
    <p>
      Lorem ipsum dolor sit amet consectetur adipisicing elit. Laudantium
      nostrum quibusdam repellat odio voluptatum vero distinctio, voluptatibus
      at eaque voluptate quod dolores ut eius animi voluptas quae sapiente sit
      mollitia!
    </p>

    <Divider />

    <SendTestPush />

    <h1>PrimeVue</h1>
    <div class="card flex justify-center"></div>

    <Divider />

    <Card>
      <template #content>
        <div>
          <FloatLabel>
            <InputText id="username" v-model="model" />
            <label for="username">Username</label>
          </FloatLabel>
        </div>
        <Divider />
        <div class="w-min">
          <IconField>
            <InputText v-model="model" variant="filled" />
            <InputIcon class="pi pi-spin pi-spinner" />
          </IconField>
        </div>
      </template>
    </Card>
    <Divider />
    <Toast />
    <Button label="Show" @click="show()" />
    <Divider />
    <Form
      v-slot="$form"
      :initialValues
      :resolver
      @submit="onFormSubmit"
      class="flex flex-col gap-4"
    >
      <div class="flex gap-1">
        <InputText
          v-model="initialValues.username"
          name="username"
          type="text"
          placeholder="Username"
          fluid
        />
        <Message
          v-if="$form.username?.invalid"
          severity="error"
          size="small"
          variant="simple"
          >{{ $form.username.error?.message }}</Message
        >
      </div>
      <Button
        type="submit"
        severity="secondary"
        size="small"
        icon="pi pi-search"
        iconPos="right"
        :label="t('words.send')"
      />
    </Form>
  </main>
</template>
