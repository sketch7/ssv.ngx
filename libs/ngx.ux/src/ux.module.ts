import { NgModule } from "@angular/core";

import { SsvUxViewportModule } from "./viewport/viewport.module";

const EXPORTED_IMPORTS = [
	SsvUxViewportModule,
];

@NgModule({
	imports: [EXPORTED_IMPORTS],
	exports: [EXPORTED_IMPORTS]
})
export class SsvUxModule {

}