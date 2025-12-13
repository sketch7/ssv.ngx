/// <reference types="vitest" />
import { defineConfig } from "vite";

import angular from "@analogjs/vite-plugin-angular";
import viteTsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [angular(), viteTsConfigPaths()],
	test: {
		name: "@ssv/ngx.ux",
		globals: true,
		environment: "jsdom",
		setupFiles: ["src/test-setup.ts"],
		include: ["src/**/*.{test,spec}.ts"],
		reporters: ["default"],
	},
});
