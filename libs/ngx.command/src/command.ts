
import { isObservable, lastValueFrom } from "rxjs";
import { toSignal } from "@angular/core/rxjs-interop";
import type { CanExecute, CanExecuteResult, CommandDisabledReason, ExecuteFn, ExecuteReturnType, ICommand } from "./command.model";
import { assertInInjectionContext, computed, inject, Injector, signal, type Signal } from "@angular/core";

export interface CommandCreateOptions {
	/** Injector used when not in an injection context, e.g. for converting an observable `canExecute`. */
	injector?: Injector;
}

/** Normalised `canExecute`. @internal */
export interface CanExecuteState {
	readonly canExecute: boolean;
	readonly reasons: readonly CommandDisabledReason[];
}

const NO_REASONS: readonly CommandDisabledReason[] = Object.freeze([]);
const ENABLED: CanExecuteState = Object.freeze({ canExecute: true, reasons: NO_REASONS });
const DISABLED: CanExecuteState = Object.freeze({ canExecute: false, reasons: NO_REASONS });

/**
 * Command object used to encapsulate information which is needed to perform an action.
 * Create one with {@link command}.
 */
export type Command<TExecute extends ExecuteFn = ExecuteFn> = ICommand<TExecute>;

/** Creates a {@link Command}. Must be used within an injection context (or the injector must be provided in the options).
 *
 * `canExecute` results: `undefined`, `true` or `[]` can execute; `false` cannot (no reasons);
 * a non-empty array of {@link CommandDisabledReason} cannot, and is exposed as `$disabledReasons`.
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
	return new CommandImpl(execute, toCanExecuteState(canExecute, injector));
}

function toState(value: CanExecuteResult | undefined): CanExecuteState {
	if (value === undefined || value === true) {
		return ENABLED;
	}
	if (value === false) {
		return DISABLED;
	}
	return value.length ? { canExecute: false, reasons: value } : ENABLED;
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

/** The {@link Command} implementation, created only by {@link command}. @internal */
export class CommandImpl<TExecute extends ExecuteFn = ExecuteFn> implements ICommand<TExecute> {

	readonly $isExecuting = signal(false);
	readonly $canExecute = computed(() => !this.$isExecuting() && this.#state().canExecute);
	readonly $disabledReasons = computed(() => this.#state().reasons);

	readonly #state: Signal<CanExecuteState>;

	constructor(
		private readonly _execute: TExecute,
		state: Signal<CanExecuteState>,
	) {
		this.#state = state;
	}

	/** Execute function to invoke. Returns Promise if the execute function returns Observable, otherwise returns the original type. */
	execute(...args: Parameters<TExecute>): ExecuteReturnType<TExecute> {
		if (!this.$canExecute()) {
			throw new Error("Command cannot execute in its current state.");
		}
		this.$isExecuting.set(true);

		try {
			const result = args.length > 0 ? this._execute(...args) : this._execute();

			if (isObservable(result)) {
				// Convert observable to promise using lastValueFrom
				// This ensures fire-and-forget execution without requiring manual subscription
				// Use defaultValue to handle empty observables (those that complete without emitting)
				const promise = lastValueFrom(result, { defaultValue: undefined })
					.finally(() => this.$isExecuting.set(false));
				return promise as ExecuteReturnType<TExecute>;
			} else if (result instanceof Promise) {
				// Return promise with proper cleanup
				return result
					.finally(() => this.$isExecuting.set(false)) as ExecuteReturnType<TExecute>;
			}
			// Sync execution
			this.$isExecuting.set(false);
			return result as ExecuteReturnType<TExecute>;
		} catch (err) {
			this.$isExecuting.set(false);
			throw err;
		}
	}

}
