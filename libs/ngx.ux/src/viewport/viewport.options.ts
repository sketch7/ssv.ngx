import { type EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from "@angular/core";

import type { Dictionary } from "../internal/internal.model";
import { ViewportDataMatchStrategy } from "./viewport-data/viewport-data-matcher";
import { VIEWPORT_SSR_DEVICE } from "./viewport-server-size.service";
import { DeviceType } from "./viewport.model";

/** Default viewport breakpoints. */
export const UX_VIEWPORT_DEFAULT_BREAKPOINTS: Dictionary<number> = {
	xsmall: 450,
	small: 767,
	medium: 992,
	large: 1200,
	xlarge: 1500,
	xxlarge: 1920,
	xxlarge1: 2100,
};

export interface UxViewportOptions {
	/** Polling speed on resizing (in milliseconds). e.g. the higher the number the longer it takes to recalculate. */
	resizePollingSpeed: number;

	/** Breakpoints to use. Key needs to match the size type and the value the width threshold.
	 * e.g. given width '1000' and `medium` is set to '992' => `large`.
	 */
	breakpoints: Dictionary<number>;

	/** Default data match strategy to use. */
	defaultDataMatchStrategy: ViewportDataMatchStrategy;
}

const DEFAULT_OPTIONS = Object.freeze<UxViewportOptions>({
	resizePollingSpeed: 33,
	breakpoints: UX_VIEWPORT_DEFAULT_BREAKPOINTS,
	defaultDataMatchStrategy: ViewportDataMatchStrategy.smaller,
});

export const VIEWPORT_OPTIONS = new InjectionToken<UxViewportOptions>("SSV_UX_VIEWPORT_OPTIONS", {
	factory: () => DEFAULT_OPTIONS,
});

export function provideSsvUxViewportOptions(
	options: Partial<UxViewportOptions> | ((defaults: Readonly<UxViewportOptions>) => Partial<UxViewportOptions>)
): EnvironmentProviders {
	return makeEnvironmentProviders([
		{
			provide: VIEWPORT_OPTIONS,
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

export function withViewportSsrDevice(options: DeviceType | (() => DeviceType)): EnvironmentProviders {
	return makeEnvironmentProviders([
		{
			provide: VIEWPORT_SSR_DEVICE,
			useFactory: () => {
				const deviceType = typeof options === "function" ? options() : options;
				return deviceType;
			},
		},
	]);
}