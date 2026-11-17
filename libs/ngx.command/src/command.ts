
import { isObservable, lastValueFrom } from "rxjs";
import { toSignal } from "@angular/core/rxjs-interop";
import type { CanExecute, CanExecuteResult, CommandDisabledReason, ExecuteFn, ExecuteReturnType, ICommand } from "./command.model";
import { assertInInjectionContext, computed, inject, Injector, signal, type Signal } from "@angular/core";

export interface CommandCreateOptions {
	/** Injector used when not in an injection context, e.g. for converting an observable `canExecute`. */
	injector?: Injector;
}

/** Normalised `canExecute`. */
export interface CanExecuteState {
	readonly canExecute: boolean;
	readonly reasons: readonly CommandDisabledReason[];
}

/** Options for the {@link Command} constructor. Prefer {@link command}, which builds them. */
export interface CommandConstructorOptions {
	/** Normalised can execute state (defaults: can execute). */
	readonly canExecute?: Signal<CanExecuteState>;
}

const NO_REASONS: readonly CommandDisabledReason[] = Object.freeze([]);
const ENABLED: CanExecuteState = Object.freeze({ canExecute: true, reasons: NO_REASONS });
const DISABLED: CanExecuteState = Object.freeze({ canExecute: false, reasons: NO_REASONS });
const ENABLED_STATE = signal(ENABLED).asReadonly();

// todo: remove
/** Creates an async {@link Command}. Must be used within an injection context.
 * @deprecated Use {@link command} instead, as it handles both sync and async execute functions.
 */
export const commandAsync = command;

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
	return new Command(execute, { canExecute: toCanExecuteState(canExecute, injector) });
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

/**
 * Command object used to encapsulate information which is needed to perform an action.
 */
export class Command<TExecute extends ExecuteFn = ExecuteFn> implements ICommand<TExecute> {

	get isExecuting(): boolean { return this.$isExecuting(); }

	get canExecute(): boolean { return this.$canExecute(); }

	readonly $isExecuting = signal(false);
	readonly $canExecute = computed(() => !this.$isExecuting() && this.#state().canExecute);
	readonly $disabledReasons = computed(() => this.#state().reasons);

	readonly #state: Signal<CanExecuteState>;

	/**
	 * Creates an instance of Command.
	 *
	 * @param execute Execute function to invoke.
	 * @param opts Normalised options, as built by {@link command}.
	 * @deprecated Use {@link command} instead for creating instances.
	 */
	constructor(
		private readonly _execute: TExecute,
		opts?: CommandConstructorOptions,
	) {
		this.#state = opts?.canExecute ?? ENABLED_STATE;
	}

	/** Execute function to invoke. Returns Promise if the execute function returns Observable, otherwise returns the original type. */
	execute(...args: Parameters<TExecute>): ExecuteReturnType<TExecute> {
		if (!this.$canExecute()) {
			throw new Error("Command cannot execute in its current state.");
			// return Promise.reject() as ReturnType<TExecute>;
		}
		this.$isExecuting.set(true);

		// console.warn("[command::execute]", args);

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
