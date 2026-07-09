import path from "node:path";
import { fileURLToPath } from "node:url";

import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import tseslint from "typescript-eslint";

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "coverage/**",
      "packages/db/migrations/**",
    ],
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["**/*.ts"],
    plugins: {
      "@eslint-community/eslint-comments": eslintComments,
    },
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["packages/db/drizzle.config.ts"],
        },
        tsconfigRootDir,
      },
    },
    rules: {
      "@eslint-community/eslint-comments/disable-enable-pair": [
        "error",
        { allowWholeFile: true },
      ],
      "@eslint-community/eslint-comments/no-duplicate-disable": "error",
      "@eslint-community/eslint-comments/no-unlimited-disable": "error",
      "@eslint-community/eslint-comments/require-description": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          minimumDescriptionLength: 20,
          "ts-check": false,
          "ts-expect-error": "allow-with-description",
          "ts-ignore": true,
          "ts-nocheck": true,
        },
      ],
      "@typescript-eslint/no-explicit-any": [
        "error",
        { fixToUnknown: false, ignoreRestArgs: false },
      ],
      "@typescript-eslint/no-floating-promises": [
        "error",
        { ignoreIIFE: false, ignoreVoid: true },
      ],
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      complexity: ["error", { max: 12 }],
      "max-lines-per-function": [
        "error",
        { max: 100, skipBlankLines: true, skipComments: true },
      ],
      "max-params": ["error", { max: 5 }],
      "no-nested-ternary": "error",
    },
  },
  {
    files: ["server/src/**/*-route.ts"],
    rules: {
      // Fastify async route plugins register routes without awaiting anything.
      "@typescript-eslint/require-await": "off",
      "max-lines-per-function": "off",
    },
  },
);
