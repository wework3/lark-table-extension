import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    base: "./",
    plugins: [react()],
    server: {
        host: "0.0.0.0",
    },
    build: {
        rollupOptions: {
            external: ["#minpath", "#minproc", "#minurl"],
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-i18next', 'i18next'],
                    'semi-ui': ['@douyinfe/semi-ui', '@douyinfe/semi-foundation'],
                    'lark-sdk': ['@lark-base-open/js-sdk'],
                },
            },
        },
        chunkSizeWarningLimit: 1000,
    },
});
