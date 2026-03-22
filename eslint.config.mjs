import nx from "@nx/eslint-plugin";
import stylisticTs from "@stylistic/eslint-plugin-ts";
import jsoncParser from "jsonc-eslint-parser";

export default [
	...nx.configs["flat/base"],
	...nx.configs["flat/typescript"],
	...nx.configs["flat/javascript"],
	{
		ignores: ["**/dist"],
	},
	{
		files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
		rules: {
			"@nx/enforce-module-boundaries": [
				"error",
				{
					enforceBuildableLibDependency: true,
					allow: ["^.*/eslint(\\.base)?\\.config\\.[cm]?js$"],
					depConstraints: [
						{
							sourceTag: "*",
							onlyDependOnLibsWithTags: ["*"],
						},
					],
				},
			],
		},
	},
	{
		files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
		// Override or add rules here
		rules: {
			"@angular-eslint/directive-selector": "off",
		},
	},
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
	{
		files: ["**/*.ts", "**/*.tsx"],
		plugins: {
			"@stylistic/ts": stylisticTs,
		},
		rules: {
			"@stylistic/ts/quotes": [
				"error",
				"double",
				{
					allowTemplateLiterals: true,
				},
			],
		},
	},
];
