import { NgModule } from "@angular/core";

import { SsvCommand } from "./command.directive";
import { SsvCommandRef } from "./command-ref.directive";

const EXPORTED_IMPORTS = [
	SsvCommand,
	SsvCommandRef
];

/** @deprecated Use standalone instead. */
@NgModule({
	imports: [EXPORTED_IMPORTS],
	exports: [EXPORTED_IMPORTS]
})
export class SsvCommandModule {

}
