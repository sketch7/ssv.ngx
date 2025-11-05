import { ApplicationConfig, provideZonelessChangeDetection } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { provideSsvCommandOptions } from "@ssv/ngx.command";
import { provideSsvUxViewportOptions } from "@ssv/ngx.ux";

import { appRoutes } from "./app.routes";

export const appConfig: ApplicationConfig = {
	providers: [
		provideZonelessChangeDetection(),
		provideRouter(appRoutes),
		provideAnimationsAsync(),

		provideSsvCommandOptions({
			executingCssClass: "is-busy",
		}),

		provideSsvUxViewportOptions({
			// breakpoints: {
			// 	small: 1000,
			// }
		},
			//  withViewportSsrDevice(() => DeviceType.mobile)
		),
		// provideSsvUxViewportOptions(defaults => {
		// 	return {
		// 		breakpoints: {
		// 			...defaults.breakpoints,
		// 			small: 1000,
		// 		}
		// 	};
		// }),
	],
};
