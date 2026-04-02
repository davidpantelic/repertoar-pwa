import { definePreset } from "@primeuix/themes";
import Aura from "@primeuix/themes/aura";

export const PrimeVueCustomPreset = definePreset(Aura, {
  semantic: {
    // focusRing: {
    //   width: "2px",
    //   style: "dashed",
    //   color: "{primary.color}",
    //   offset: "1px",
    // },
    // formField: {
    //   paddingX: "10px",
    //   paddingY: "10px",
    // },
    primary: {
      50: "{green.50}",
      100: "{green.100}",
      200: "{green.200}",
      300: "{green.300}",
      400: "{green.400}",
      500: "{green.500}",
      600: "{green.600}",
      700: "{green.700}",
      800: "{green.800}",
      900: "{green.900}",
      950: "{green.950}",
    },
    colorScheme: {
      light: {
        surface: {
          0: "#ffffff",
          50: "{zinc.50}",
          100: "{zinc.200}",
          200: "{zinc.200}",
          300: "{zinc.300}",
          400: "{zinc.400}",
          500: "{zinc.500}",
          600: "{zinc.600}",
          700: "{zinc.700}",
          800: "{zinc.800}",
          900: "{zinc.900}",
          950: "{zinc.950}",
        },
        formField: {
          hoverBorderColor: "{primary.color}",
        },
      },
      dark: {
        surface: {
          0: "#ffffff",
          50: "{gray.50}",
          100: "{gray.100}",
          200: "{gray.200}",
          300: "{gray.300}",
          400: "{gray.400}",
          500: "{gray.500}",
          600: "{gray.600}",
          700: "{gray.700}",
          800: "{gray.800}",
          900: "{gray.900}",
          950: "{gray.950}",
        },
        formField: {
          hoverBorderColor: "{primary.color}",
        },
      },
    },
  },
  components: {
    button: {
      //   paddingX: "10px",
      //   paddingY: "10px",
    },
  },
});
