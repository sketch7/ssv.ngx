import type { Observable } from "rxjs";
import type { Signal } from "@angular/core";
import type { MaybeAsync } from "./private";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExecuteFn<TArgs extends any[] = any[], TReturn = unknown> = (...args: TArgs) => MaybeAsync<TReturn>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExecuteAsyncFn<TArgs extends any[] = any[], TReturn = unknown> = (...args: TArgs) => Observable<TReturn> | Promise<TReturn>;
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

	/** Determines whether to auto destroy when having 0 subscribers (defaults to `true`).
	 * @deprecated Use using command/commandAsync is handled automatically.
	 */
	autoDestroy: boolean;

	/** Execute function to invoke. */
	execute(...args: Parameters<TExecute>): ReturnType<TExecute>;

	/** Disposes all resources held by subscriptions. */
	destroy(): void;

	/** Subscribe listener, in order to handle auto disposing.
	 * @deprecated Use using command/commandAsync is handled automatically.
	 */
	subscribe(): void;

	/**
	 * Unsubscribe listener, in order to handle auto disposing.
	 * @deprecated Use using command/commandAsync is handled automatically.
	*/
	unsubscribe(): void;
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
