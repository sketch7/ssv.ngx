import { NgModule } from "@angular/core";

import { SsvViewportMatcherDirective, SsvViewportMatcherVarDirective } from "./index";
import { ViewportDataPipe } from "./viewport-data/viewport-data.pipe";

const EXPORTED_IMPORTS = [
	SsvViewportMatcherDirective,
	SsvViewportMatcherVarDirective,
	ViewportDataPipe,
];

@NgModule({
	imports: [EXPORTED_IMPORTS],
	exports: [EXPORTED_IMPORTS]
})
export class SsvUxViewportModule {

}