import { defineConfig } from "vitest/config";

import angular from "@analogjs/vite-plugin-angular";
import viteTsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [angular(), viteTsConfigPaths()],
	test: {
		name: "@ssv/ngx.command",
		globals: true,
		environment: "jsdom",
		setupFiles: ["src/test-setup.ts"],
		include: ["src/**/*.{test,spec}.ts"],
		reporters: ["default"],
		typecheck: {
			enabled: true,
			tsconfig: "./tsconfig.spec.json",
			include: ["src/**/*.test-d.ts"],
		},
	},
});
