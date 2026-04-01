<script setup lang="ts"></script>

<template>
  <main>
    <h1>Webdak Vue PWA <span class="text-3xl">v36</span></h1>
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

    <Divider />

    <h2>API testing</h2>
    <br />

    <WriteToIndexedDB />

    <Divider />

    <ReadFromIndexedDB />

    <Divider />

    <WriteToSupabase />

    <Divider />

    <ReadFromSupabase />

    <Divider />

    <SyncDb />

    <Divider />

    <EditDeleteRecords />

    <Divider />

    <ShowDeletedRecords />

    <Divider />
  </main>
</template>
