<script setup lang="ts">
const visible = ref(false);
</script>

<template>
  <Drawer v-model:visible="visible" position="right" class="settings-drawer">
    <div class="flex flex-col gap-3 py-1">
      <ColorModeButton />

      <!-- <RouterLink to="/chat" @click="visible = false">
        <Button severity="secondary" icon="pi pi-comments" size="large" />
      </RouterLink> -->

      <ScreenWakeLock />
      <RefreshButton />
      <CheckUpdateButton />
      <!-- <EnablePushButton /> -->
      <AboutApp @page-link="visible = false" />
      <LocaleChange />
    </div>
  </Drawer>

  <Button
    icon="pi pi-cog"
    size="large"
    severity="secondary"
    @click="visible = true"
  />
</template>
