import { type EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from "@angular/core";
import type { UxViewportOptions } from "./viewport";
import { UX_VIEWPORT_DEFAULT_CONFIG } from "./viewport/viewport.const";

// todo: separate viewport options?
export interface UxOptions {
	viewport: UxViewportOptions;
}

const DEFAULT_OPTIONS = Object.freeze<UxOptions>({
	viewport: UX_VIEWPORT_DEFAULT_CONFIG,
});

export const UX_OPTIONS = new InjectionToken<UxOptions>("SSV_UX_OPTIONS", {
	factory: () => DEFAULT_OPTIONS,
});

export function provideSsvUxOptions(
	options: Partial<UxOptions> | ((defaults: Readonly<UxOptions>) => Partial<UxOptions>)
): EnvironmentProviders {
	return makeEnvironmentProviders([
		{
			provide: UX_OPTIONS,
			useFactory: () => {
				let opts = typeof options === "function" ? options(DEFAULT_OPTIONS) : options;
				opts = opts
					? {
						...DEFAULT_OPTIONS,
						...opts, // NOTE: breakpoints shoudn't be merged
					}
					: DEFAULT_OPTIONS;
				return opts;
			},
		},
	]);
}
