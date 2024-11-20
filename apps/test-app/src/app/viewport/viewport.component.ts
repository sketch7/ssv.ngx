import {
	Component,
	ChangeDetectionStrategy,
	OnInit,
	OnDestroy,
	ChangeDetectorRef,
} from "@angular/core";
import { Observable, Subject, tap } from "rxjs";
import {
	ViewportSizeTypeInfo,
	ViewportService,
	ViewportSize,
	ViewportDataConfig,
	ViewportDataService,
	ViewportDataMatchStrategy,
	SsvUxViewportModule
} from "@ssv/ngx.ux";
import { JsonPipe } from "@angular/common";

@Component({
	selector: "app-viewport",
	templateUrl: "./viewport.component.html",
	styleUrls: ["./viewport.component.scss"],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: true,
	imports: [
		SsvUxViewportModule,
		JsonPipe,
	]
})
export class ViewportComponent implements OnInit, OnDestroy {

	sizeInfo: ViewportSizeTypeInfo | undefined;
	size: ViewportSize | undefined;
	isVisible = true;
	dataConfig: ViewportDataConfig<string> = {
		default: "default",
		small: "small",
		large: "large",
		xlarge: "laaarger (xlarge)",
	};

	private readonly _destroy$ = new Subject<void>();

	constructor(
		private viewport: ViewportService,
		private viewportData: ViewportDataService,
		private cdr: ChangeDetectorRef,
	) { }

	ngOnInit(): void {
		const sizeType$ = this.viewport.sizeType$.pipe(
			tap(x => console.log("Viewport - size info changed", x)),
			tap(x => this.sizeInfo = x),
			tap(() => this.cdr.markForCheck()),
		);
		const size$ = this.viewport.size$.pipe(
			tap(x => console.log("Viewport - size changed", x)),
			tap(x => this.size = x),
			tap(() => this.cdr.markForCheck()),
		);

		const viewportData$ = this.viewportData.get$(this.dataConfig, ViewportDataMatchStrategy.smaller).pipe(
			tap(x => console.log("Viewport - data changed", x)),
		);

		[sizeType$, size$, viewportData$]
			.forEach((x: Observable<unknown>) => x.subscribe());
	}

	ngOnDestroy(): void {
		this._destroy$.next();
		this._destroy$.complete();
	}

}
