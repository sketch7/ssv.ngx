import { Subscription, tap } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Pipe, PipeTransform, ChangeDetectorRef, inject, DestroyRef } from "@angular/core";

import { ViewportDataConfig, ViewportDataMatchStrategy, ViewportDataMatchStrategyLiteral } from "./viewport-data-matcher";
import { ViewportDataService } from "./viewport-data.service";


@Pipe({
	name: "ssvViewportData",
	pure: false,
	standalone: true,
})
export class ViewportDataPipe implements PipeTransform {
	#viewportData = inject(ViewportDataService);
	#cdr = inject(ChangeDetectorRef);
	#destroyRef = inject(DestroyRef);

	private markForTransform = true;
	private value: unknown;
	private data: ViewportDataConfig | undefined;
	private strategy: ViewportDataMatchStrategyLiteral | undefined;
	private data$$ = Subscription.EMPTY;

	transform(data: ViewportDataConfig, strategy: ViewportDataMatchStrategyLiteral): unknown {
		if (!this.markForTransform && data === this.data && strategy === this.strategy) {
			return this.value;
		}
		this.data = data;
		this.strategy = strategy;

		this.data$$.unsubscribe();
		this.data$$ = this.#viewportData.get$(data, ViewportDataMatchStrategy[strategy]).pipe(
			tap(value => {
				this.markForTransform = true;
				this.value = value;
				this.#cdr.markForCheck();
			}),
			takeUntilDestroyed(this.#destroyRef),
		).subscribe();

		this.markForTransform = false;
		return this.value;
	}

}
