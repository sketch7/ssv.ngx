import { Route } from '@angular/router';

import { ExampleCommandComponent } from "./command/example-command.component";
import { HomeComponent } from "./home/home.component";

export const appRoutes: Route[] = [
	{ path: "", component: HomeComponent },
	{ path: "command", component: ExampleCommandComponent },
];
