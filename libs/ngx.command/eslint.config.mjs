import nx from "@nx/eslint-plugin";
import jsoncParser from "jsonc-eslint-parser";
import baseConfig from "../../eslint.config.mjs";

export default [
	...baseConfig,
	{
		files: ["**/*.json"],
		rules: {
			"@nx/dependency-checks": [
				"error",
				{
					ignoredFiles: [
						"{projectRoot}/eslint.config.{js,cjs,mjs}",
						"{projectRoot}/**/*.spec.ts",
						"{projectRoot}/vitest.config.ts",
						"{projectRoot}/src/test-setup.ts",
					],
				},
			],
		},
		languageOptions: { parser: jsoncParser },
	},
	...nx.configs["flat/angular"],
	...nx.configs["flat/angular-template"],
	{
		files: ["**/*.ts"],
		rules: {
			"@angular-eslint/directive-selector": [
				"error",
				{
					type: "attribute",
					prefix: "ssv",
					style: "camelCase",
				},
			],
			"@angular-eslint/component-selector": [
				"error",
				{
					type: "element",
					prefix: "ssv",
					style: "kebab-case",
				},
			],
			"@angular-eslint/directive-selector": "off",
			"@angular-eslint/no-input-rename": "off",
		},
	},
	{
		files: ["**/*.html"],
		// Override or add rules here
		rules: {},
	},
];
