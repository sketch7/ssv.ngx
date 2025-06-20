import { inject, Injectable } from "@angular/core";
import { Observable, distinctUntilChanged, map } from "rxjs";

import { ViewportSizeTypeInfo } from "../viewport.model";
import { ViewportService } from "../viewport.service";
import { matchViewportData, ViewportDataConfig, ViewportDataMatchStrategy } from "./viewport-data-matcher";
import { generateViewportRulesRangeFromDataMatcher, ViewportDataRule } from "./viewport-data.utils";
import { VIEWPORT_OPTIONS } from "../viewport.options";

@Injectable({
	providedIn: "root",
})
export class ViewportDataService {

	readonly #viewport = inject(ViewportService);
	readonly #config = inject(VIEWPORT_OPTIONS);

	/** Get data for match. */
	get<T>(
		dataConfig: ViewportDataConfig<T>,
		strategy: ViewportDataMatchStrategy = this.#config.defaultDataMatchStrategy,
		sizeType: ViewportSizeTypeInfo = this.#viewport.sizeTypeSnapshot
	): T | undefined {
		return matchViewportData(dataConfig, sizeType, strategy, this.#viewport.sizeTypes, this.#viewport.sizeTypeMap);
	}

	/** Get data for match as observable. */
	get$<T>(dataConfig: ViewportDataConfig<T>, strategy?: ViewportDataMatchStrategy, throttle = true): Observable<T | undefined> {
		return (throttle ? this.#viewport.sizeType$ : this.#viewport.sizeTypeSnap$).pipe(
			map(sizeType => this.get<T>(dataConfig, strategy, sizeType)),
			distinctUntilChanged(),
		);
	}

	/** Generate rules based on strategies for data. */
	generateRules<T>(
		dataConfig: ViewportDataConfig<T>,
		strategy: ViewportDataMatchStrategy = this.#config.defaultDataMatchStrategy,
	): ViewportDataRule<T>[] {
		return generateViewportRulesRangeFromDataMatcher(
			dataConfig,
			strategy,
			this.#viewport.sizeTypes,
			this.#viewport.sizeTypeMap
		);
	}

}
