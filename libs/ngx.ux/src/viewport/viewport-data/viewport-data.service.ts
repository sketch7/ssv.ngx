import { inject, Injectable } from "@angular/core";
import { Observable, distinctUntilChanged, map } from "rxjs";
import { UX_CONFIG } from "../../config";

import { ViewportSizeTypeInfo } from "../viewport.model";
import { ViewportService } from "../viewport.service";
import { matchViewportData, ViewportDataConfig, ViewportDataMatchStrategy } from "./viewport-data-matcher";
import { generateViewportRulesRangeFromDataMatcher, ViewportDataRule } from "./viewport-data.utils";

@Injectable({
	providedIn: "root",
})
export class ViewportDataService {

	private readonly viewport = inject(ViewportService);
	private readonly config = inject(UX_CONFIG);

	/** Get data for match. */
	get<T>(
		dataConfig: ViewportDataConfig<T>,
		strategy: ViewportDataMatchStrategy = this.config.viewport.defaultDataMatchStrategy,
		sizeType: ViewportSizeTypeInfo = this.viewport.sizeTypeSnapshot
	): T | undefined {
		return matchViewportData(dataConfig, sizeType, strategy, this.viewport.sizeTypes, this.viewport.sizeTypeMap);
	}

	/** Get data for match as observable. */
	get$<T>(dataConfig: ViewportDataConfig<T>, strategy?: ViewportDataMatchStrategy, throttle = true): Observable<T | undefined> {
		return (throttle ? this.viewport.sizeType$ : this.viewport.sizeTypeSnap$).pipe(
			map(sizeType => this.get<T>(dataConfig, strategy, sizeType)),
			distinctUntilChanged(),
		);
	}

	/** Generate rules based on strategies for data. */
	generateRules<T>(
		dataConfig: ViewportDataConfig<T>,
		strategy: ViewportDataMatchStrategy = this.config.viewport.defaultDataMatchStrategy,
	): ViewportDataRule<T>[] {
		return generateViewportRulesRangeFromDataMatcher(
			dataConfig,
			strategy,
			this.viewport.sizeTypes,
			this.viewport.sizeTypeMap
		);
	}

}
