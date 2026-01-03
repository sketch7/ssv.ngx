
import { isObservable, lastValueFrom } from "rxjs";
import { toSignal } from "@angular/core/rxjs-interop";
import type { CanExecute, ExecuteAsyncFn, ExecuteFn, ExecuteReturnType, ICommand } from "./command.model";
import { assertInInjectionContext, computed, inject, Injector, isSignal, signal, type Signal } from "@angular/core";

export interface CommandCreateOptions {
	injector?: Injector;
}

// todo: remove
/** Creates an async {@link Command}. Must be used within an injection context.
 * NOTE: this auto injects `DestroyRef` and handles auto destroy. {@link ICommand.autoDestroy} should not be used.
 * @deprecated Use {@link command} instead, as it handles both sync and async execute functions.
 */
export function commandAsync<TExecute extends ExecuteAsyncFn>(
	execute: TExecute,
	canExecute$?: CanExecute,
	opts?: CommandCreateOptions,
): Command<TExecute> {
	return command(execute, canExecute$, opts);
}

/** Creates a {@link Command}. Must be used within an injection context.
 * NOTE: this auto injects `DestroyRef` and handles auto destroy. {@link ICommand.autoDestroy} should not be used.
 */
export function command<TExecute extends ExecuteFn>(
	execute: TExecute,
	canExecute$?: CanExecute,
	opts?: CommandCreateOptions,
): Command<TExecute> {
	if (!opts?.injector) {
		assertInInjectionContext(command);
	}
	const injector = opts?.injector ?? inject(Injector);
	const cmd = new Command(execute, canExecute$, injector);
	return cmd;
}

/**
 * Command object used to encapsulate information which is needed to perform an action.
 */
export class Command<TExecute extends ExecuteFn = ExecuteFn> implements ICommand<TExecute> {

	get isExecuting(): boolean { return this.$isExecuting(); }

	get canExecute(): boolean { return this.$canExecute(); }

	readonly $isExecuting = signal(false);
	readonly $canExecute = computed(() => !this.$isExecuting() && this.#canExecute());

	readonly #canExecute: Signal<boolean>;

	/**
	 * Creates an instance of Command.
	 *
	 * @param execute Execute function to invoke.
	 * @param canExecute Observable which determines whether it can execute or not.
	 * @deprecated Use {@link command} or {@link commandAsync} instead for creating instances.
	 */
	constructor(
		private readonly _execute: TExecute,
		canExecute$?: CanExecute,
		injector?: Injector,
	) {
		if (canExecute$) {
			const canExecute = typeof canExecute$ === "function"
				? computed(canExecute$)
				: canExecute$;
			this.#canExecute = isSignal(canExecute)
				? canExecute
				: toSignal(canExecute, { initialValue: false, injector });
		} else {
			this.#canExecute = computed(() => true);
		}
	}

	/** Execute function to invoke. Returns Promise if the execute function returns Observable, otherwise returns the original type. */
	execute(...args: Parameters<TExecute>): ExecuteReturnType<TExecute> {
		if (!this.$canExecute()) {
			throw new Error("Command cannot execute in its current state.");
			// return Promise.reject() as ReturnType<TExecute>;
		}
		this.$isExecuting.set(true);

		console.warn("[command::execute]", args);

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
