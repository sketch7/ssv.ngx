import { Route } from '@angular/router';

import { ExampleCommandComponent } from "./command/example-command.component";
import { HomeComponent } from "./home/home.component";
import { ViewportComponent } from "./viewport/viewport.component";

export const appRoutes: Route[] = [
	{ path: "", component: HomeComponent },
	{ path: "command", component: ExampleCommandComponent },
	{ path: "ux-viewport", component: ViewportComponent },
];
