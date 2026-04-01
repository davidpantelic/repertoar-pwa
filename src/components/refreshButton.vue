<script setup lang="ts">
const { t } = useI18n();
const reloading = ref(false);

const onRefresh = () => {
  if (reloading.value) return;
  reloading.value = true;
  window.location.reload();
};
</script>

<template>
  <Button
    :icon="reloading ? 'pi pi-spinner pi-spin' : 'pi pi-refresh'"
    severity="secondary"
    size="large"
    :disabled="reloading"
    @click="onRefresh"
  />
</template>
