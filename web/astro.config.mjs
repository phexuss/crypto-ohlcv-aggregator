// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	// Build output goes to ../public/ so Elysia can serve it
	outDir: "../public",
	build: {
		assets: "assets",
	},
	vite: {
		server: {
			proxy: {
				"/api": {
					target: "http://localhost:3000",
					changeOrigin: true,
				},
			},
		},
	},
});
