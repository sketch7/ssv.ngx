import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from "@angular/core";

export interface CommandOptions {
	/**
	 * Css Class which gets added/removed on the Command element's host while Command `isExecuting$`.
	 */
	executingCssClass: string;

	/** Determines whether the disabled will be handled by the directive or not.
	 * Disable handled by directive's doesn't always play nice when used with other component/pipe/directive and they also handle disabled.
	 * This disables the handling manually and need to pass explicitly `[disabled]="!saveCmd.canExecute"`.
	 */
	handleDisabled: boolean;

	/** Determine whether to set a `delay(1)` when setting the disabled. Which might be needed when working with external
	 * components/directives (such as material button)
	 */
	hasDisabledDelay: boolean;
}

const DEFAULT_OPTIONS = Object.freeze<CommandOptions>({
	executingCssClass: "executing",
	handleDisabled: true,
	hasDisabledDelay: false,
});

export const COMMAND_OPTIONS = new InjectionToken<CommandOptions>("SSV_COMMAND_OPTIONS", {
	factory: () => DEFAULT_OPTIONS,
});

export function provideSsvCommandOptions(options: Partial<CommandOptions> | (() => Partial<CommandOptions>)): EnvironmentProviders {
	let opts = typeof options === "function" ? options() : options;
	opts = opts
		? {
			...DEFAULT_OPTIONS,
			...opts,
		}
		: DEFAULT_OPTIONS;
	return makeEnvironmentProviders([
		{
			provide: DEFAULT_OPTIONS,
			useValue: opts,
		},
	]);
}
