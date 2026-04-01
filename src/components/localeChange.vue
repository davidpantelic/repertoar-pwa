<script setup lang="ts">
const { locale, availableLocales } = useI18n();

const localeOptions = computed(() =>
  // availableLocales.map((loc) => ({ label: loc.toUpperCase(), value: loc })),
  [...availableLocales]
    .sort((a, b) => {
      if (a === "sr") return -1;
      if (b === "sr") return 1;
      return a.localeCompare(b);
    })
    .map((loc) => ({ label: loc.toUpperCase(), value: loc })),
);
</script>

<template>
  <div class="card flex justify-center">
    <Select
      v-model="locale"
      :options="localeOptions"
      optionLabel="label"
      optionValue="value"
      variant="filled"
      class="flex-col w-full items-center [&>span]:w-auto! pb-2"
    >
      <template #option="slotProps">
        <div class="flex items-center">
          <img
            :alt="slotProps.option.label"
            :src="'/' + slotProps.option.label.toLowerCase() + '.png'"
            class="w-6 h-4 object-cover mr-2"
          />
          <div>{{ slotProps.option.label }}</div>
        </div>
      </template>
      <template #dropdownicon>
        <!-- <i class="pi pi-language" /> -->
        <img
          :alt="locale"
          :src="'/' + locale.toLowerCase() + '.png'"
          class="w-6 h-4 object-cover"
        />
      </template>
      <template #header>
        <div class="p-3 w-min">
          {{ $t("words.chooseLanguage") }}
        </div>
      </template>
    </Select>
  </div>
</template>
