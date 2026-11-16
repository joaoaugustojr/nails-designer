// @ts-check
import eslintConfigPrettier from "eslint-config-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";

import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt(
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            // External packages (and side-effect package imports)
            ["^\\u0000", "^node:", "^@?\\w"],
            // Nuxt virtual aliases
            ["^#"],
            // App aliases
            ["^@/", "^~/"],
            // Relative imports
            ["^\\.\\.(?!/?$)", "^\\.\\./?$", "^\\./(?!.+\\.(s?css|sass|less)$)", "^\\./?$"],
            // Style side-effects
            ["^.+\\.(s?css|sass|less)$"],
          ],
        },
      ],
      "simple-import-sort/exports": "error",
    },
  },
  {
    // shadcn-vue components take an optional `class` prop merged through `cn()`;
    // a default value would defeat the merge.
    files: ["app/components/ui/**/*.vue"],
    rules: {
      "vue/require-default-prop": "off",
    },
  },
  eslintConfigPrettier,
);
