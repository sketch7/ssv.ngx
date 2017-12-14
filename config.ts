import { InjectionToken } from "@angular/core";

export interface CommandOptions {
	/**
	 * Css Class which gets added/removed on the Command element's host while Command `isExecuting$`.
	 */
	executingCssClass: string;
}

export const COMMAND_DEFAULT_CONFIG: CommandOptions = {
	executingCssClass: "executing",
};

export const COMMAND_CONFIG = new InjectionToken<CommandOptions>("command-config");
