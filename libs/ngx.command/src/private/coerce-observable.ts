import { from, isObservable, of, type Observable } from "rxjs";

/** Type that represents a sync or async value. */
export type MaybeAsync<T> = T | Observable<T> | Promise<T>;

/** Coerce value to observable. */
export function coerceObservable<T>(value: MaybeAsync<T>): Observable<T> {
	if (isObservable(value)) {
		return value;
	}
	// if (isSignal(value)) {
	// 	return toObservable(value, options);
	// }
	if (value instanceof Promise) {
		return from(value);
	}

	return of(value);
}
