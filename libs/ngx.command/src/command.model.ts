import type { Observable } from "rxjs";
import type { Signal } from "@angular/core";

import type { MaybeAsync } from "./private";

/** Converts Observable<T> to Promise<T>, leaves other types unchanged */
export type ConvertObservableToPromise<T> = T extends Observable<infer U> ? Promise<U> : T;

/** Return type of Execute function, converting Observable to Promise if needed */
export type ExecuteReturnType<TExecute extends ExecuteFn> = ConvertObservableToPromise<ReturnType<TExecute>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExecuteFn<TArgs extends any[] = any[], TReturn = unknown> = (...args: TArgs) => MaybeAsync<TReturn>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExecuteAsyncFn<TArgs extends any[] = any[], TReturn = unknown> = (...args: TArgs) => Observable<TReturn> | Promise<TReturn>;
// todo: signal like type
export type CanExecute = (() => boolean) | Signal<boolean> | Observable<boolean>;

export interface ICommand<TExecute extends ExecuteFn = ExecuteFn> {
	/** Determines whether the command is currently executing, as a snapshot value.
	 * @deprecated Use {@link $isExecuting} signal instead.
	*/
	readonly isExecuting: boolean;

	/** Determines whether the command is currently executing, as a signal. */
	readonly $isExecuting: Signal<boolean>;

	/** Determines whether the command can execute or not, as a snapshot value.
	 * @deprecated Use {@link $canExecute} signal instead.
	*/
	readonly canExecute: boolean;

	/** Determines whether the command can execute or not, as a signal. */
	readonly $canExecute: Signal<boolean>;

	/** Execute function to invoke. Returns Promise if the execute function returns Observable, otherwise returns the original type. */
	execute(...args: Parameters<TExecute>): ExecuteReturnType<TExecute>;
}

export interface CommandCreator {
	// todo: stricter typing
	// execute: (...args: TParams extends unknown[] ? TParams : [TParams]) => Observable<unknown> | Promise<unknown> | void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	execute: (...args: any[]) => Observable<unknown> | Promise<unknown> | void;
	// CanExecute | ((...args: any[]) => CanExecute);
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	canExecute?: CanExecute | Function;
	params?: unknown | unknown[];
	host: unknown;
}
