import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideSsvCommandOptions } from "@ssv/ngx.command";

import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
	providers: [
		provideZoneChangeDetection({ eventCoalescing: true }),
		provideRouter(appRoutes),
		provideAnimationsAsync(),

		provideSsvCommandOptions({
			executingCssClass: "is-busy",
			hasDisabledDelay: false
		}),
	],
};
