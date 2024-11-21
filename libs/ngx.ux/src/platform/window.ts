import { InjectionToken, Injectable, inject } from "@angular/core";

export const WINDOW = new InjectionToken<Window>("Window", {
	factory: () => _window() as Window,
});

export function _window(): unknown {
	if (typeof window !== "undefined") {
		return window;
	}
	return {};
}

@Injectable({
	providedIn: "root",
})
export class WindowRef {

	private readonly window = inject(WINDOW);

	/** Window underlying native object. */
	get native(): Window {
		return this.window as Window;
	}

	/** Determines whether native element is supported or not. Generally `false` when executing in SSR. */
	get hasNative(): boolean {
		return !!this.native.window;
	}

}
