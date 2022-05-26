import { theme } from "../src/theme/theme";
import { themes } from "@storybook/theming";
import { initialize, mswDecorator } from 'msw-storybook-addon';
import { I18nDecorator } from "./decorators";

initialize({
  onUnhandledRequest: 'error'
});

const darkTheme = {
  ...themes.dark,
  colorPrimary: theme.colors.blue[500],
  colorSecondary: theme.colors.gray[500],
  appBg: theme.colors.gray[800],
  appContentBg: theme.colors.gray[750],
  appBorderColor: theme.colors.gray[700],
  appBorderRadius: 4,
  fontBase: theme.fonts.body,
  fontCode: "monospace",
  brandTitle: "ShapeShift",
};

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  darkMode: {
    current: "dark",
    dark: darkTheme,
  },
  chakra: {
    theme: theme,
  },
};

export const decorators = [mswDecorator, I18nDecorator];
