<script setup lang="ts">
const { isSupported, isActive, toggleSWL } = useScreenWakeLock();
</script>

<template>
  <Button
    :disabled="!isSupported"
    icon="pi pi-lightbulb"
    :severity="isActive ? 'success' : 'secondary'"
    size="large"
    @click="toggleSWL"
  />
</template>
