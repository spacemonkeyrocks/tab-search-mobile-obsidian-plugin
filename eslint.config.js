const globals = require("globals");
const js = require("@eslint/js");
const prettierConfig = require("eslint-config-prettier");

module.exports = [
  // Apply recommended ESLint rules
  js.configs.recommended,
  // Disable any ESLint rules that conflict with Prettier
  prettierConfig,
  {
    // Apply this configuration to all JavaScript files in the src/ directory
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Example rule: warn about unused variables instead of erroring
      "no-unused-vars": "warn",
    },
  },
];