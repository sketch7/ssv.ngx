import { NgModule } from "@angular/core";

import { CommandDirective } from "./command.directive";
import { CommandRefDirective } from "./command-ref.directive";

const EXPORTED_IMPORTS = [
	CommandDirective,
	CommandRefDirective
];

@NgModule({
	imports: [EXPORTED_IMPORTS],
	exports: [EXPORTED_IMPORTS]
})
export class SsvCommandModule {

}
