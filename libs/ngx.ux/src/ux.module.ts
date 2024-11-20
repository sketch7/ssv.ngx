import { NgModule } from "@angular/core";

import { SsvViewportMatcherDirective, SsvViewportMatcherVarDirective } from "./viewport/index";
import { ViewportDataPipe } from "./viewport/viewport-data/viewport-data.pipe";

const EXPORTED_IMPORTS = [
	SsvViewportMatcherDirective,
	SsvViewportMatcherVarDirective,
	ViewportDataPipe,
];

// todo: create module for Viewport
@NgModule({
	imports: [EXPORTED_IMPORTS],
	exports: [EXPORTED_IMPORTS]
})
export class SsvUxModule {

}