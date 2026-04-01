<script setup lang="ts">
const { toggleDark, toggleIcon } = useAppTheme();
</script>

<template>
  <Button
    :icon="toggleIcon"
    severity="contrast"
    @click="toggleDark()"
    size="large"
  />
</template>
