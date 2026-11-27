import { InjectionToken, type Provider } from "@angular/core";

export interface CommandOptions {
	/** CSS class added to the `ssvCommand` host element while the command is executing (`isExecuting()`). */
	executingCssClass: string;

	/** Whether `ssvCommand` sets the host element's `disabled` property from `canExecute()` (default `true`).
	 * Turn it off when another component/directive on the element owns `disabled`, and bind it yourself:
	 * `[disabled]="!saveCmd.canExecute()"` (call the signal: without `()` it compiles and is never disabled).
	 */
	handleDisabled: boolean;
}

const DEFAULT_OPTIONS = Object.freeze<CommandOptions>({
	executingCssClass: "executing",
	handleDisabled: true,
});

export const COMMAND_OPTIONS = new InjectionToken<CommandOptions>("SSV_COMMAND_OPTIONS", {
	factory: () => DEFAULT_OPTIONS,
});

export function provideSsvCommandOptions(
	options: Partial<CommandOptions> | ((defaults: Readonly<CommandOptions>) => Partial<CommandOptions>)
): Provider[] {
	return [
		{
			provide: COMMAND_OPTIONS,
			useFactory: () => {
				let opts = typeof options === "function" ? options(DEFAULT_OPTIONS) : options;
				opts = opts
					? {
						...DEFAULT_OPTIONS,
						...opts,
					}
					: DEFAULT_OPTIONS;
				return opts;
			},
		},
	];
}
