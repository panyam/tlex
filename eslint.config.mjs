import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginPrettier from "eslint-plugin-prettier";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      "prettier/prettier": "error",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "no-useless-escape": "off",
      // Grouped case labels here carry a comment quoting the grammar production
      // they cover, which is enough to make the case non-empty for this rule.
      "no-fallthrough": ["error", { allowEmptyCase: true }],
    },
  },
  {
    // The conformance suite quotes patterns straight out of ECMA-262, including
    // the pathological ones these rules exist to catch.
    files: ["src/tests/**/*.ts"],
    rules: {
      "no-control-regex": "off",
      "no-useless-backreference": "off",
      "no-empty-character-class": "off",
    },
  },
  {
    ignores: ["node_modules/**", "lib/**", "sites/**", "docs/**", "**/*.js", "**/*.mjs"],
  },
);
