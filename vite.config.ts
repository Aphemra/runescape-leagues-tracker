import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS && repositoryName ? `/${repositoryName}/` : "/",
  build: {
    // League datasets are lazy-loaded and compress to a small fraction of their raw size.
    chunkSizeWarningLimit: 1400,
  },
});
