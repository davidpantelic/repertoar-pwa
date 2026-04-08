let cached:
  | {
      isDark: Ref<boolean>;
      toggleDark: () => boolean;
      toggleIcon: ComputedRef<string>;
    }
  | undefined;

export function useAppTheme() {
  if (cached) return cached;

  const colorMode = useColorMode();
  const colorModeColor = computed(() => {
    return colorMode.value == "dark"
      ? "#121212"
      : colorMode.value == "light"
        ? "#fff"
        : "";
  });

  useHead({
    meta: [
      {
        name: "theme-color",
        content: colorModeColor,
      },
      {
        name: "color-scheme",
        content: "#00ca53",
      },
    ],
  });

  const isDark = useDark({
    selector: "html",
    attribute: "class",
    valueDark: "dark-mode",
    valueLight: "light-mode",
  });
  const toggleDark = useToggle(isDark);
  const toggleIcon = computed(() =>
    isDark.value ? "pi pi-sun" : "pi pi-moon",
  );

  cached = { isDark, toggleDark, toggleIcon };
  return cached;
}
