import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";

export function useScrollPanelOverflow() {
  const scrollPanelWrapper = ref<HTMLElement | null>(null);
  const hasVerticalOverflow = ref(false);

  let resizeObserver: ResizeObserver | null = null;
  let mutationObserver: MutationObserver | null = null;
  let animationFrame = 0;

  const getScrollContent = () =>
    scrollPanelWrapper.value?.querySelector<HTMLElement>(
      ".p-scrollpanel-content",
    ) ?? null;

  const measureOverflow = () => {
    const content = getScrollContent();
    hasVerticalOverflow.value = Boolean(
      content && content.scrollHeight > content.clientHeight + 1,
    );
  };

  const scheduleOverflowMeasurement = async () => {
    await nextTick();
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(measureOverflow);
  };

  onMounted(async () => {
    await nextTick();

    const wrapper = scrollPanelWrapper.value;
    const content = getScrollContent();
    if (!wrapper || !content) return;

    resizeObserver = new ResizeObserver(() => {
      void scheduleOverflowMeasurement();
    });
    resizeObserver.observe(wrapper);
    resizeObserver.observe(content);

    mutationObserver = new MutationObserver(() => {
      void scheduleOverflowMeasurement();
    });
    mutationObserver.observe(content, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    measureOverflow();
  });

  onBeforeUnmount(() => {
    cancelAnimationFrame(animationFrame);
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
  });

  return {
    scrollPanelWrapper,
    hasVerticalOverflow,
    scheduleOverflowMeasurement,
  };
}
