import { NgModule } from "@angular/core";

import { ViewportDataPipe } from "./viewport-data/viewport-data.pipe";
import { SsvViewportMatcherVarDirective } from "./viewport-matcher-var.directive";
import { SsvViewportMatcherDirective } from "./viewport-matcher.directive";

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