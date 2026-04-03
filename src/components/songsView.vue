<script setup lang="ts">
import type { Song, SongUpsertPayload } from "@/types";

const props = defineProps<{
  songs: Song[];
}>();
</script>

<template>
  <ul>
    <li v-for="song in props.songs" :key="song.id">
      {{ song.name }} - {{ song.artist }} - {{ song.note }}
    </li>
  </ul>
</template>
