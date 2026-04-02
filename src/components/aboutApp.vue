<script setup lang="ts">
const aboutDialogVisible = ref(false);
const emit = defineEmits(["pageLink"]);

const openDialog = () => {
  aboutDialogVisible.value = true;
};

const copied = ref(false);
const copyAppLink = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    copied.value = true;

    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (e) {
    console.error("Copy failed", e);
  }
};

const openLink = (url: string) => {
  window.open(url, "_blank");
};
</script>

<template>
  <Button
    icon="pi pi-question-circle"
    size="large"
    severity="secondary"
    @click="openDialog"
  />

  <Dialog
    class="about-dialog w-[90%] max-w-4xl"
    v-model:visible="aboutDialogVisible"
    modal
    :header="$t('aboutTitle')"
  >
    <Accordion>
      <AccordionPanel value="0">
        <AccordionHeader>{{ $t("aboutAppInstall.title") }}</AccordionHeader>
        <AccordionContent>
          <div class="flex flex-col gap-3">
            <p>
              {{ $t("aboutAppInstall.text1") }}
            </p>
            <p>
              {{ $t("aboutAppInstall.text2") }}
            </p>
            <i18n-t scope="global" keypath="aboutAppInstall.text2" tag="p">
              <strong>{{ $t("words.install") }}</strong>
            </i18n-t>
            <p>
              {{ $t("aboutAppInstall.text3") }}
            </p>
            <Button
              size="small"
              :label="!copied ? $t('words.copyLink') : $t('words.linkCopied')"
              :icon="!copied ? 'pi pi-copy' : 'pi pi-check'"
              :disabled="copied"
              icon-pos="right"
              @click="copyAppLink"
            />
            <p>
              {{ $t("aboutAppInstall.text4") }}
            </p>
            <p>
              {{ $t("aboutAppInstall.text5") }}
            </p>
            <p>
              {{ $t("aboutAppInstall.text6") }}
            </p>
          </div>
        </AccordionContent>
      </AccordionPanel>

      <AccordionPanel value="1">
        <AccordionHeader>{{ $t("aboutNotifications.title") }}</AccordionHeader>
        <AccordionContent>
          <div class="flex flex-col gap-3">
            <p>
              {{ $t("aboutNotifications.text1") }}
              <Chip
                icon="pi pi-bell"
                class="p-1.5! rounded-md! [&>span]:text-sm! [&>span]:inline-flex! [&>span]:items-center [&>span]:justify-center"
              />, {{ $t("aboutNotifications.text2") }}
            </p>
            <i18n-t scope="global" keypath="aboutNotifications.text3" tag="p">
              <i>{{ $t("aboutNotifications.selectAppUrl") }}</i>
            </i18n-t>
          </div>
        </AccordionContent>
      </AccordionPanel>

      <AccordionPanel value="2">
        <AccordionHeader>{{ $t("aboutOffline.title") }}</AccordionHeader>
        <AccordionContent>
          <div class="flex flex-col gap-3">
            <p>
              {{ $t("aboutOffline.text1") }}
            </p>
            <p>
              {{ $t("aboutOffline.text2") }}
              <Chip
                icon="pi pi-wifi"
                class="p-1.5! rounded-md! [&>span]:text-sm! [&>span]:inline-flex! [&>span]:items-center [&>span]:justify-center"
              />
              {{ $t("aboutOffline.text3") }}
            </p>
          </div>
        </AccordionContent>
      </AccordionPanel>

      <AccordionPanel value="3">
        <AccordionHeader>{{ $t("aboutApp.title") }}</AccordionHeader>
        <AccordionContent>
          <div class="flex flex-col gap-1">
            <p>
              {{ $t("aboutApp.text1") }}
              <Button
                label="Webdak"
                variant="link"
                icon="pi pi-external-link"
                size="small"
                class="p-0!"
                iconPos="right"
                @click="openLink('https://webdak.rs')"
              />
            </p>

            <Button asChild v-slot="slotProps" variant="link" size="small">
              <RouterLink
                to="/privacy"
                class="p-0! w-fit hover:underline"
                :class="slotProps.class"
                @click="((aboutDialogVisible = false), emit('pageLink'))"
              >
                {{ $t("privacyPolicy.title") }}
              </RouterLink>
            </Button>
            <Button asChild v-slot="slotProps" variant="link" size="small">
              <RouterLink
                to="/terms"
                class="p-0! w-fit hover:underline"
                :class="slotProps.class"
                @click="((aboutDialogVisible = false), emit('pageLink'))"
              >
                {{ $t("termsOfUse.title") }}
              </RouterLink>
            </Button>
          </div>
        </AccordionContent>
      </AccordionPanel>
    </Accordion>

    <template #closebutton>
      <Button
        severity="secondary"
        size="small"
        icon="pi pi-times"
        variant="text"
        @click="aboutDialogVisible = false"
      />
    </template>
  </Dialog>
</template>
