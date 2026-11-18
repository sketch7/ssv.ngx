import type { Observable } from "rxjs";
import type { Signal } from "@angular/core";

export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {};

/** Type that represents a sync or async value. */
export type MaybeAsync<T> = T | Observable<T> | Promise<T>;

/** Converts Observable<T> to Promise<T>, leaves other types unchanged */
export type ConvertObservableToPromise<T> = T extends Observable<infer U> ? Promise<U> : T;

/** Return type of Execute function, converting `Observable` to `Promise` if needed */
export type ExecuteReturnType<TExecute extends ExecuteFn> = ConvertObservableToPromise<ReturnType<TExecute>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExecuteFn<TArgs extends any[] = any[], TReturn = unknown> = (...args: TArgs) => MaybeAsync<TReturn>;

/** Why a command cannot execute. Carries no display text: the UI translates `code` (interpolating `params`). */
export interface CommandDisabledReason {
	/** Stable code, e.g. `"hero.banned"`, typically used as the translation key. */
	readonly code: string;
	/** Interpolation params for the translated text, e.g. `{ max: 4 }`. */
	readonly params?: Readonly<Record<string, unknown>>;
}

/** `true` or `[]` can execute; `false` cannot (no reason); a non-empty array cannot, with those reasons. */
export type CanExecuteResult = boolean | readonly CommandDisabledReason[];

/** Determines whether a command can execute. A function (including a signal) is reactive: signals read inside it are tracked. */
export type CanExecute = CanExecuteResult | (() => CanExecuteResult) | Observable<CanExecuteResult>;

/**
 * Type for command parameters that allows:
 * - Single parameter passed directly (not in array)
 * - Multiple parameters as tuple array
 * - Single array parameter wrapped in array to prevent spreading
 */
export type CommandParams<TExec extends ExecuteFn> =
	Parameters<TExec> extends [infer Single]
	? Single | [Single]  // Allow single param directly OR in array
	: Parameters<TExec> extends []
	? never  // No params
	: Parameters<TExec>;  // Multiple params as tuple

/** `command` input type convenience.
 * @example
 * For a command with a single parameter:
 * ```ts
 * readonly myCmd = input.required<CommandInput<MyType>>();
 * ```
 * For a command with multiple parameters:
 * ```ts
 * readonly myCmd = input.required<CommandInput<[param1: string, param2: number]>>();
 * ```
 */
export type CommandInput<TArgs = unknown, R = unknown> =
	TArgs extends readonly [unknown, ...unknown[]]  // Multi-element tuple?
	? Command<(...args: TArgs) => R>
	: TArgs extends readonly [infer Single]  // Single-element tuple?
	? Command<(arg: Single) => R>
	: Command<(arg: TArgs) => R>;  // Single non-array type

/**
 * Command object used to encapsulate information which is needed to perform an action.
 * Create one with `command()`.
 */
export interface Command<TExecute extends ExecuteFn = ExecuteFn> {
	/** Determines whether the command is currently executing, as a signal. */
	readonly isExecuting: Signal<boolean>;

	/** Determines whether the command can execute or not, as a signal. */
	readonly canExecute: Signal<boolean>;

	/** Why the command cannot execute, as returned by `canExecute`. Empty when it can, or when no reason was given.
	 * Executing is not a reason: while executing `canExecute()` is false but this is unaffected.
	 */
	readonly disabledReasons: Signal<readonly CommandDisabledReason[]>;

	/** Execute function to invoke. Returns Promise if the execute function returns Observable, otherwise returns the original type. */
	execute(...args: Parameters<TExecute>): ExecuteReturnType<TExecute>;
}

export interface CommandCreator<TExecute extends ExecuteFn = ExecuteFn> {
	/** Execute function to invoke. */
	execute: TExecute;
	/** Determines whether the command can execute or not (see {@link CanExecute}), optionally per params.
	 * A function returning a boolean or reasons is re-evaluated when the signals it reads change.
	 */
	canExecute?: CanExecute | ((...args: Parameters<TExecute>) => CanExecute);
	/** Parameters to pass to the execute function. */
	params?: CommandParams<TExecute>;
	/** Host context for binding the execute function. */
	host: unknown;
}
