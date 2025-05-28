import { Injectable, inject, signal } from "@angular/core";
import { takeUntilDestroyed, toObservable } from "@angular/core/rxjs-interop";
import {
	Observable,
	fromEvent,
	map,
	tap,
	distinctUntilChanged,
	startWith,
	share,
	shareReplay,
	auditTime,
} from "rxjs";

import { ViewportSizeTypeInfo, ViewportSize } from "./viewport.model";
import { WindowRef } from "../platform/window";
import { ViewportServerSizeService } from "./viewport-server-size.service";
import { generateViewportSizeTypeInfoList, generateViewportSizeTypeInfoRefs, getSizeTypeInfo } from "./viewport.util";
import { VIEWPORT_OPTIONS } from "./viewport.options";

@Injectable({
	providedIn: "root",
})
export class ViewportService {

	readonly #viewportServerSize = inject(ViewportServerSizeService);
	readonly #windowRef = inject(WindowRef);
	readonly #config = inject(VIEWPORT_OPTIONS);

	/** Viewport size types list ordered by type, smallest to largest. */
	readonly sizeTypes = generateViewportSizeTypeInfoList(this.#config.breakpoints);

	/** Size types refs of the generated viewport size type info. */
	readonly sizeTypeMap = generateViewportSizeTypeInfoRefs(this.sizeTypes);

	/** Viewport size signal (which is also throttled). */
	readonly viewportSize = signal<ViewportSize>(this.#viewportServerSize.get())

	/** Viewport size type signal (which is also throttled). */
	readonly sizeType = signal<ViewportSizeTypeInfo>(getSizeTypeInfo(this.viewportSize().width, this.sizeTypes));

	/** Window resize observable. */
	readonly resizeSnap$: Observable<ViewportSize>;

	/** Window resize observable (which is also throttled). */
	readonly resize$: Observable<ViewportSize>;

	/** Viewport size type observable (which is also throttled). */
	readonly sizeType$: Observable<ViewportSizeTypeInfo>;

	/** Viewport size type observable. */
	readonly sizeTypeSnap$: Observable<ViewportSizeTypeInfo>;

	/** Viewport size type snapshot of the last value. (Prefer use `sizeType$` observable when possible.) */
	get sizeTypeSnapshot(): ViewportSizeTypeInfo { return this.sizeType(); }

	/** Viewport size observable (which is also throttled). */
	readonly size$: Observable<ViewportSize>;

	/** Viewport size observable. */
	readonly sizeSnap$: Observable<ViewportSize>;

	constructor(
	) {
		if (this.#windowRef.hasNative) {
			this.resizeSnap$ = fromEvent<Event>(this.#windowRef.native, "resize").pipe(
				map(() => this.getViewportSize()),
				share()
			);

			this.resize$ = this.resizeSnap$.pipe(
				auditTime(this.#config.resizePollingSpeed),
				share(),
			);
		} else {
			this.resizeSnap$ = this.resize$ = toObservable(this.viewportSize);
		}
		const size = this.getViewportSize();

		const sizeFn = (obs$: Observable<ViewportSize>) => obs$.pipe(
			startWith(size),
			distinctUntilChanged((a, b) => a.width === b.width && a.height === b.height),
			shareReplay(1),
		);

		this.sizeSnap$ = sizeFn(this.resizeSnap$);
		this.size$ = sizeFn(this.resize$);

		const sizeTypeFn = (obs$: Observable<ViewportSize>) => obs$.pipe(
			distinctUntilChanged((a, b) => a.width === b.width),
			map(x => getSizeTypeInfo(x.width, this.sizeTypes)),
			distinctUntilChanged(),
			shareReplay(1),
		);

		this.sizeType$ = sizeTypeFn(this.size$);
		this.sizeTypeSnap$ = sizeTypeFn(this.sizeSnap$);

		const setViewportSize$ = this.size$.pipe(
			tap(size => this.viewportSize.set(size)),
			takeUntilDestroyed(),
		);

		const setSizeType$ = this.sizeTypeSnap$.pipe(
			tap(size => this.sizeType.set(size)),
			takeUntilDestroyed(),
		);

		[
			setViewportSize$,
			setSizeType$
		].forEach((obs$: Observable<unknown>) => obs$.subscribe());
	}

	/** Returns the current viewport size */
	private getViewportSize(): ViewportSize {
		if (!this.#windowRef.hasNative) {
			return this.#viewportServerSize.get();
		}

		const ua = navigator.userAgent.toLowerCase();
		if (ua.indexOf("safari") !== -1 && ua.indexOf("chrome") === -1) { // safari subtracts the scrollbar width
			return {
				width: this.#windowRef.native.document.documentElement.clientWidth,
				height: this.#windowRef.native.document.documentElement.clientHeight,
			};
		}

		return {
			width: this.#windowRef.native.innerWidth,
			height: this.#windowRef.native.innerHeight,
		};
	}

}
