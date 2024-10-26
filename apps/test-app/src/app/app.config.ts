import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideSsvCommandOptions } from "@ssv/ngx.command";

import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
	providers: [
		provideZoneChangeDetection({ eventCoalescing: true }),
		provideRouter(appRoutes),

		provideSsvCommandOptions({
			executingCssClass: "is-busy",
			hasDisabledDelay: false
		})
	],
};
