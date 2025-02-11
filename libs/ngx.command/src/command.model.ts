import type { Observable } from "rxjs";
import type { Signal } from "@angular/core";

export type ExecuteFn = (...args: any[]) => unknown;
export type ExecuteAsyncFn = (...args: any[]) => Observable<unknown> | Promise<unknown>;
export type CanExecute = (() => boolean) | Signal<boolean> | Observable<boolean>;

export interface ICommand {
	/** Determines whether the command is currently executing, as a snapshot value. */
	readonly isExecuting: boolean;

	/** Determines whether the command is currently executing, as a signal. */
	readonly $isExecuting: Signal<boolean>;

	// /** Determines whether the command is currently executing, as an observable. */
	// readonly isExecuting$: Observable<boolean>;

	/** Determines whether the command can execute or not, as a snapshot value. */
	readonly canExecute: boolean;

	/** Determines whether the command can execute or not, as a signal. */
	readonly $canExecute: Signal<boolean>;

	// /** Determines whether the command can execute or not, as an observable. */
	// readonly canExecute$: Observable<boolean>;

	/** Determines whether to auto destroy when having 0 subscribers (defaults to `true`). */
	autoDestroy: boolean;

	/** Execute function to invoke. */
	execute(...args: unknown[]): void;

	/** Disposes all resources held by subscriptions. */
	destroy(): void;

	/** Subscribe listener, in order to handle auto disposing. */
	subscribe(): void;

	/** Unsubscribe listener, in order to handle auto disposing. */
	unsubscribe(): void;
}

export interface CommandCreator {
	// todo: stricter typing
	// execute: (...args: TParams extends unknown[] ? TParams : [TParams]) => Observable<unknown> | Promise<unknown> | void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	execute: (...args: any[]) => Observable<unknown> | Promise<unknown> | void;
	// CanExecute | ((...args: any[]) => CanExecute);
	canExecute?: CanExecute | Function;
	params?: unknown | unknown[];
	isAsync?: boolean;
	host: unknown;
}
