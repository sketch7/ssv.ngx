import { isObservable, lastValueFrom, type Observable } from "rxjs";
import { toSignal } from "@angular/core/rxjs-interop";
import type { CanExecute, CanExecuteResult, CommandDisabledReason, ExecuteFn, ExecuteReturnType, Command } from "./command.model";
import { assertInInjectionContext, computed, inject, Injector, signal, type Signal } from "@angular/core";

export interface CommandCreateOptions {
	/** Injector used when not in an injection context, e.g. for converting an observable `canExecute`. */
	injector?: Injector;
}

/** Normalised `canExecute`. @internal */
export interface CanExecuteState {
	readonly enabled: boolean;
	readonly reasons: readonly CommandDisabledReason[];
}

const NO_REASONS: readonly CommandDisabledReason[] = Object.freeze([]);
const ENABLED: CanExecuteState = Object.freeze({ enabled: true, reasons: NO_REASONS });
const DISABLED: CanExecuteState = Object.freeze({ enabled: false, reasons: NO_REASONS });

/** Creates a {@link Command}. Must be used within an injection context (or the injector must be provided in the options).
 *
 * `canExecute` results: `undefined`, `true` or `[]` can execute; `false` cannot (no reasons);
 * a non-empty array of {@link CommandDisabledReason} cannot, and is exposed as `disabledReasons`.
 */
export function command<TExecute extends ExecuteFn>(
	execute: TExecute,
	canExecute?: CanExecute,
	opts?: CommandCreateOptions,
): Command<TExecute> {
	if (!opts?.injector) {
		assertInInjectionContext(command);
	}
	const injector = opts?.injector ?? inject(Injector);
	const state = toCanExecuteState(canExecute, injector);
	return new CommandImpl<TExecute>(
		execute,
		() => state().enabled,
		computed(() => state().reasons),
	);
}

type ResolvedResult<T> = T extends Observable<infer Value> ? Awaited<Value> | undefined : Awaited<T>;

/** What every lifecycle hook receives: the readonly arguments the decorated command was called with. */
export interface CommandLifecycleEvent<TExecute extends ExecuteFn> {
	readonly params: Readonly<Parameters<TExecute>>;
}

/** Synchronous hooks for a command decorated with {@link withCommandLifecycle}. */
export interface CommandLifecycle<TExecute extends ExecuteFn> {
	readonly onStart?: (event: CommandLifecycleEvent<TExecute>) => void;
	readonly onSuccess?: (event: CommandLifecycleEvent<TExecute> & { readonly result: ResolvedResult<ReturnType<TExecute>> }) => void;
	readonly onError?: (event: CommandLifecycleEvent<TExecute> & { readonly error: unknown }) => void;
}

/**
 * Wraps a command with synchronous callbacks for calls made through the returned command.
 * The wrapper tracks its own execution and shares the source's guard and disabled reasons.
 *
 * @example
 * ```ts
 * const observed = withCommandLifecycle(saveCommand, {
 *   onSuccess: ({ result }) => showSaved(result),
 *   onError: ({ error }) => showSaveError(error),
 * });
 * ```
 */
export function withCommandLifecycle<TExecute extends ExecuteFn>(
	source: Command<TExecute>,
	lifecycle: CommandLifecycle<NoInfer<TExecute>>,
): Command<TExecute> {
	const execute = (...params: Parameters<TExecute>) => {
		lifecycle.onStart?.({ params });

		const onError = (error: unknown): never => {
			lifecycle.onError?.({ params, error });
			throw error;
		};

		let result: unknown;
		try {
			result = source.execute(...params);
		} catch (error) {
			return onError(error);
		}

		const onSuccess = (value: unknown) => {
			lifecycle.onSuccess?.({ params, result: value as ResolvedResult<ReturnType<TExecute>> });
			return value;
		};
		return isThenable(result) ? Promise.resolve(result).then(onSuccess, onError) : onSuccess(result);
	};

	return new CommandImpl<TExecute>(execute, () => source.canExecute(), source.disabledReasons);
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
	// Zone.js swaps the global Promise, so a native async result can fail instanceof Promise.
	return typeof (value as PromiseLike<unknown> | undefined)?.then === "function";
}

function toState(value: CanExecuteResult | undefined): CanExecuteState {
	if (value === undefined || value === true) {
		return ENABLED;
	}
	if (value === false) {
		return DISABLED;
	}
	return value.length ? { enabled: false, reasons: value } : ENABLED;
}

function toCanExecuteState(canExecute: CanExecute | undefined, injector: Injector): Signal<CanExecuteState> {
	// reasons arrays are detected before the observable branch, so they never reach `toSignal`
	if (canExecute === undefined || typeof canExecute === "boolean" || isReasons(canExecute)) {
		return signal(toState(canExecute)).asReadonly();
	}
	if (typeof canExecute === "function") {
		return computed(() => toState(canExecute()));
	}
	const value = toSignal(canExecute, { initialValue: false, injector });
	return computed(() => toState(value()));
}

/** `Array.isArray` as a guard which also narrows `readonly` arrays. */
function isReasons(value: unknown): value is readonly CommandDisabledReason[] {
	return Array.isArray(value);
}

/** The shared {@link Command} implementation. @internal */
export class CommandImpl<TExecute extends ExecuteFn = ExecuteFn> implements Command<TExecute> {

	readonly isExecuting = signal(false);
	readonly canExecute: Signal<boolean>;

	constructor(
		private readonly _execute: (...args: Parameters<TExecute>) => unknown,
		canExecute: () => boolean,
		readonly disabledReasons: Signal<readonly CommandDisabledReason[]>,
	) {
		this.canExecute = computed(() => !this.isExecuting() && canExecute());
	}

	/** Execute function to invoke. Returns Promise if the execute function returns Observable, otherwise returns the original type. */
	execute(...args: Parameters<TExecute>): ExecuteReturnType<TExecute> {
		if (!this.canExecute()) {
			throw new Error("Command cannot execute in its current state.");
		}
		this.isExecuting.set(true);

		try {
			const result = this._execute(...args);

			if (isObservable(result)) {
				// Convert observable to promise using lastValueFrom
				// This ensures fire-and-forget execution without requiring manual subscription
				// Use defaultValue to handle empty observables (those that complete without emitting)
				const promise = lastValueFrom(result, { defaultValue: undefined })
					.finally(() => this.isExecuting.set(false));
				return promise as ExecuteReturnType<TExecute>;
			} else if (isThenable(result)) {
				return Promise.resolve(result).finally(() => this.isExecuting.set(false)) as ExecuteReturnType<TExecute>;
			}
			// Sync execution
			this.isExecuting.set(false);
			return result as ExecuteReturnType<TExecute>;
		} catch (err) {
			this.isExecuting.set(false);
			throw err;
		}
	}

}
