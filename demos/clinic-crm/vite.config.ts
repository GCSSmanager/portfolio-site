import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/crm/demo/clinic/" : "/",
  build: {
    outDir: "../../_site/crm/demo/clinic",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: true,
  },
}));
