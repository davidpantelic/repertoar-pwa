import type { ComponentResolver } from "unplugin-vue-components";

export function ArkUIResolver(): ComponentResolver {
  return (name) => {
    if (!name.startsWith("Ark")) return;

    const baseName = name.slice(3);
    if (baseName.startsWith("Tabs")) {
      const suffix = baseName.slice("Tabs".length);
      const tabsPlural = new Set(["Root", "RootProvider", "Context"]);
      const importName = tabsPlural.has(suffix)
        ? `Tabs${suffix}`
        : `Tab${suffix}`;
      return {
        name: importName,
        from: "@ark-ui/vue",
      };
    }

    const importName = baseName;
    return {
      name: importName,
      from: "@ark-ui/vue",
    };
  };
}
