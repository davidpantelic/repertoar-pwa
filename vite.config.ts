import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import tailwindcss from "@tailwindcss/vite";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import VueRouter from "unplugin-vue-router/vite";
import { ArkUIResolver } from "./vite/ark-ui-resolver";
import { PrimeVueResolver } from "@primevue/auto-import-resolver";
import { VitePWA } from "vite-plugin-pwa";
import Icons from "unplugin-icons/vite";
import IconsResolver from "unplugin-icons/resolver";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    VitePWA({
      injectRegister: "auto",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      includeAssets: ["favicon.ico", "robots.txt"],
      manifest: {
        name: "Repertoar",
        short_name: "Repertoar",
        description: "Songs playlist manager",
        theme_color: "#0f1c0d",
        background_color: "#0f1c0d",
        orientation: "portrait",
        display: "standalone",
        start_url: "/",
        scope: "/",
        id: "/",
        // related_applications: [
        // const relatedApps = await navigator.getInstalledRelatedApps();
        // const PWAisInstalled = relatedApps.length > 0;
        //   {
        //     platform: "webapp",
        //     url: "https://example.com/manifest.json",
        //   },
        // ],

        // categories: [""],

        // share_target: {
        //   action: "",
        //   method: "POST",
        //   enctype: "multipart/form-data",
        //   params: {
        //     title: "name",
        //     text: "description",
        //     url: "link",
        //     files: [
        //       {
        //         name: "photos",
        //         accept: "image/png",
        //       },
        //     ],
        //   },
        // },

        // shortcuts: [
        //   {
        //     name: "",
        //     short_name: "",
        //     description: "",
        //     url: "",
        //     icons: [{ src: "", sizes: "" }],
        //   },
        // ],
        icons: [
          {
            src: "/repertoar_192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/repertoar_384.png",
            sizes: "384x384",
            type: "image/png",
          },
          {
            src: "/repertoar_512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/repertoar_512_maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/repertoar_1024.png",
            sizes: "1024x1024",
            type: "image/png",
          },
        ],
      },
      injectManifest: {
        globPatterns: [
          "**/*.{js,ts,css,html,ico,png,jpg,webp,avif,svg,woff,woff2,ttf,pdf}",
        ],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
    VueRouter({
      routesFolder: "src/pages",
      dts: "src/types/generated/typed-router.d.ts",
    }),
    vue(),
    vueDevTools(),
    tailwindcss(),
    Icons({
      autoInstall: false,
    }),
    AutoImport({
      imports: [
        "vue",
        "vue-router",
        "pinia",
        "@vueuse/core",
        {
          from: "@vueuse/integrations/useCookies",
          imports: ["useCookies"],
        },
        {
          from: "@unhead/vue",
          imports: ["useHead", "useSeoMeta"],
        },
        {
          from: "primevue/usetoast",
          imports: ["useToast"],
        },
        {
          from: "primevue/useconfirm",
          imports: ["useConfirm"],
        },
        {
          "vue-i18n": ["useI18n"],
        },
      ],
      dts: "src/types/generated/auto-imports.d.ts",
      vueTemplate: true,
      dirs: [
        "src/composables",
        "src/components",
        "src/services/**",
        "src/utils",
      ],
    }),

    Components({
      dts: "src/types/generated/components.d.ts",
      dirs: ["src/components"],
      deep: true,
      resolvers: [
        ArkUIResolver(),
        PrimeVueResolver(),
        IconsResolver({
          prefix: "Icon",
          enabledCollections: ["material-symbols-light"],
          alias: {
            msl: "material-symbols-light",
          },
        }),
      ],
      // directoryAsNamespace: true,
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
