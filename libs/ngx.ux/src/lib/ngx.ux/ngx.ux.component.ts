import { ChangeDetectionStrategy, Component, ViewEncapsulation } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
	selector: "ssv-ngx.ux",
	standalone: true,
	imports: [CommonModule],
	templateUrl: "./ngx.ux.component.html",
	encapsulation: ViewEncapsulation.None,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgxUxComponent {}
