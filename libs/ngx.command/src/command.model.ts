import type { Observable } from "rxjs";
import type { Signal } from "@angular/core";

/** Type that represents a sync or async value. */
export type MaybeAsync<T> = T | Observable<T> | Promise<T>;

type SignalLike<T> = (() => T);

/** Converts Observable<T> to Promise<T>, leaves other types unchanged */
export type ConvertObservableToPromise<T> = T extends Observable<infer U> ? Promise<U> : T;

/** Return type of Execute function, converting `Observable` to `Promise` if needed */
export type ExecuteReturnType<TExecute extends ExecuteFn> = ConvertObservableToPromise<ReturnType<TExecute>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExecuteFn<TArgs extends any[] = any[], TReturn = unknown> = (...args: TArgs) => MaybeAsync<TReturn>;

export type CanExecute = SignalLike<boolean> | Signal<boolean> | Observable<boolean> | boolean;

// todo: rename to Command and Command to CommandImpl or similar
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

export interface CommandCreator<TExecute extends ExecuteFn = ExecuteFn> {
	/** Execute function to invoke. */
	execute: TExecute;
	/** Determines whether the command can execute or not. Can be a signal, observable, or function. */
	canExecute?: CanExecute | ((...args: Parameters<TExecute>) => CanExecute);
	/** Parameters to pass to the execute function. */
	params?: Parameters<TExecute>;
	/** Host context for binding the execute function. */
	host: unknown;
}
