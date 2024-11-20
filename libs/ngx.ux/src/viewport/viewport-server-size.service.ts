import { Injectable, InjectionToken, inject } from "@angular/core";

import { DeviceType, ViewportSize } from "./viewport.model";

// todo: make this configurable
/** Viewport size for SSR. */
const viewportSizeSSR: Record<DeviceType, ViewportSize> = {
	[DeviceType.desktop]: {
		width: 1366,
		height: 768,
	},
	[DeviceType.tablet]: {
		width: 768,
		height: 1024,
	},
	[DeviceType.mobile]: {
		width: 414,
		height: 736,
	},
};

export const VIEWPORT_SSR_DEVICE = new InjectionToken<DeviceType>("UX_VIEWPORT_SSR_DEVICE", {
	factory: () => DeviceType.desktop,
});

@Injectable({
	providedIn: "root",
})
export class ViewportServerSizeService {

	private readonly deviceType = inject(VIEWPORT_SSR_DEVICE);

	get(): ViewportSize {
		return viewportSizeSSR[this.deviceType] || viewportSizeSSR[DeviceType.desktop];
	}

}
