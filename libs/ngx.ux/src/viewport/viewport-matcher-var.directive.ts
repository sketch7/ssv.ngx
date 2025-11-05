import { OnInit, Directive, Input, TemplateRef, ViewContainerRef, EmbeddedViewRef, inject, DestroyRef } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { combineLatest, ReplaySubject, tap, map } from "rxjs";

import { ViewportService } from "./viewport.service";
import {
	isViewportSizeMatcherExpression,
	isViewportSizeMatcherTupleExpression,
	isViewportConditionMatch
} from "./viewport.util";
import { ViewportMatchConditions, ViewportSizeMatcherExpression } from "./viewport.model";

const NAME_CAMEL = "ssvViewportMatcherVar";

export class SsvViewportMatcherVarContext {

	constructor(
		public $implicit = false,
	) { }

}

@Directive({
	selector: `[${NAME_CAMEL}]`,
	standalone: true,
})
export class SsvViewportMatcherVar implements OnInit {
	#viewport = inject(ViewportService);
	#viewContainer = inject(ViewContainerRef);
	#templateRef = inject<TemplateRef<SsvViewportMatcherVarContext>>(TemplateRef);
	#destroyRef = inject(DestroyRef);

	private _matchConditions: ViewportMatchConditions = {};
	private _context = new SsvViewportMatcherVarContext();
	private readonly _update$ = new ReplaySubject<void>(1);
	private _viewRef!: EmbeddedViewRef<SsvViewportMatcherVarContext>;

	@Input(`${NAME_CAMEL}When`) set condition(value: string | string[] | ViewportSizeMatcherExpression) {
		if (isViewportSizeMatcherExpression(value)) {
			this._matchConditions.expression = value;
		} else if (isViewportSizeMatcherTupleExpression(value)) {
			const [op, size] = value;
			this._matchConditions.expression = {
				operation: op,
				size
			};
		} else {
			this._matchConditions.sizeType = value;
		}

		this._update$.next();
	}

	ngOnInit(): void {
		this.updateView();
		combineLatest([this.#viewport.sizeType$, this._update$]).pipe(
			map(([sizeType]) => isViewportConditionMatch(sizeType, this._matchConditions, this.#viewport.sizeTypeMap)),
			tap(x => this._context.$implicit = x),
			tap(() => this._viewRef.markForCheck()),
			takeUntilDestroyed(this.#destroyRef),
		).subscribe();
	}

	private updateView(): void {
		this.#viewContainer.clear();
		this._viewRef = this.#viewContainer.createEmbeddedView(this.#templateRef, this._context);
	}

}
