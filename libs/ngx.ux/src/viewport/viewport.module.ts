import { NgModule } from "@angular/core";

import { ViewportDataPipe } from "./viewport-data/viewport-data.pipe";
import { SsvViewportMatcherVar } from "./viewport-matcher-var.directive";
import { SsvViewportMatcher } from "./viewport-matcher.directive";

const EXPORTED_IMPORTS = [
	SsvViewportMatcher,
	SsvViewportMatcherVar,
	ViewportDataPipe,
];

/** @deprecated Use standalone instead. */
@NgModule({
	imports: [EXPORTED_IMPORTS],
	exports: [EXPORTED_IMPORTS]
})
export class SsvUxViewportModule {

}