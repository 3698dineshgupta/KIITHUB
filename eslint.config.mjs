import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Use FlatCompat to convert eslintrc-style configs to flat config
export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next",
      "node_modules",
      "dist",
      "build",
      ".git",
      "coverage",
      ".env",
      ".env.local",
      "db_data",
      "*.lock",
    ],
  },
];
