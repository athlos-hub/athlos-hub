import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default [
  js.configs.recommended,

  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["node_modules/**", "dist/**", "build/**", "**/*.js"],
  },

  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
        sourceType: "module",
      },
      globals: {
        node: true,
        jest: true,
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly",
        module: "readonly",
        require: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      prettier: prettier,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs["recommended-requiring-type-checking"].rules,

      ...prettierConfig.rules,

      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",

      "no-console": "warn",
      "prettier/prettier": [
        "error",
        {
          endOfLine: "auto",
        },
      ],
    },
  },

  {
    files: ["**/*.spec.ts", "**/*.e2e-spec.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
