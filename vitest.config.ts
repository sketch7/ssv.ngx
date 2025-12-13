/// <reference types="vitest" />
import { defineConfig } from "vite";

import angular from "@analogjs/vite-plugin-angular";
import viteTsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [angular(), viteTsConfigPaths()],
	test: {
		globals: true,
		environment: "jsdom",
		reporters: ["default"],
		projects: [
			"./libs/*",
		],
	},
});
