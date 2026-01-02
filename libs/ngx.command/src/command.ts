
import { Observable, Subscription, isObservable } from "rxjs";
import { toSignal } from "@angular/core/rxjs-interop";
import type { CanExecute, ExecuteAsyncFn, ExecuteFn, ICommand } from "./command.model";
import { assertInInjectionContext, computed, DestroyRef, inject, Injector, isSignal, signal, type Signal } from "@angular/core";

export interface CommandCreateOptions {
	injector?: Injector;
}

/** Creates an async {@link Command}. Must be used within an injection context.
 * NOTE: this auto injects `DestroyRef` and handles auto destroy. {@link ICommand.autoDestroy} should not be used.
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
	const destroyRef = injector.get(DestroyRef);
	const cmd = new Command(execute, canExecute$, injector);
	cmd.autoDestroy = false;

	destroyRef.onDestroy(() => {
		// console.warn("[command::destroy]");
		cmd.destroy();
	});
	return cmd;
}

/**
 * Command object used to encapsulate information which is needed to perform an action.
 *
 */
export class Command<TExecute extends ExecuteFn = ExecuteFn> implements ICommand<TExecute> {

	get isExecuting(): boolean { return this.$isExecuting(); }

	get canExecute(): boolean { return this.$canExecute(); }

	readonly $isExecuting = signal(false);
	readonly $canExecute = computed(() => !this.$isExecuting() && this._$canExecute());

	private readonly _$canExecute: Signal<boolean>;

	autoDestroy = true;

	// private executionPipe$: Observable<unknown | undefined>;
	private executionPipe$$ = Subscription.EMPTY;
	private subscribersCount = 0;

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
			this._$canExecute = isSignal(canExecute)
				? canExecute
				: toSignal(canExecute, { initialValue: false, injector });
		} else {
			this._$canExecute = signal(true);
		}
		// this.executionPipe$ = this.#buildExecutionPipe(execute);
	}

	/** Execute function to invoke. */
	execute(...args: Parameters<TExecute>): ReturnType<TExecute> {
		if (!this.$canExecute()) {
			return Promise.reject() as ReturnType<TExecute>;
		}
		this.$isExecuting.set(true);

		console.warn("[command::execute]", args);

		try {
			const result = args.length > 0 ? this._execute(...args) : this._execute();

			if (isObservable(result)) {
				// For observables, we need to track the subscription
				// The isExecuting will be reset when observable completes/errors
				const tracked$ = new Observable(subscriber => {
					const sub = result.subscribe({
						next: (value) => subscriber.next(value),
						error: (err) => {
							this.$isExecuting.set(false);
							console.error("Unhandled execute error", err);
							subscriber.error(err);
						},
						complete: () => {
							this.$isExecuting.set(false);
							subscriber.complete();
						}
					});
					return () => sub.unsubscribe();
				});
				return tracked$ as ReturnType<TExecute>;
			} else if (result instanceof Promise) {
				// Return promise with proper cleanup
				return result
					.then((value) => {
						this.$isExecuting.set(false);
						return value;
					})
					.catch((error) => {
						this.$isExecuting.set(false);
						console.error("Unhandled execute error", error);
						throw error;
					}) as ReturnType<TExecute>;
			}
			// Sync execution
			this.$isExecuting.set(false);
			return result as ReturnType<TExecute>;
		} catch (err) {
			this.$isExecuting.set(false);
			console.error("Unhandled execute error", err);
			throw err;
		}
	}

	/** Disposes all resources held by subscriptions. */
	destroy(): void {
		// console.warn("[command::destroy]");
		this.executionPipe$$.unsubscribe();
	}

	subscribe(): void {
		this.subscribersCount++;
	}

	unsubscribe(): void {
		this.subscribersCount--;
		// console.log("[command::unsubscribe]", { autoDestroy: this.autoDestroy, subscribersCount: this.subscribersCount });
		if (this.autoDestroy && this.subscribersCount <= 0) {
			this.destroy();
		}
	}

	// #buildExecutionPipe(execute: (...args: unknown[]) => MaybeAsync<unknown>): Observable<unknown> {
	// 	const pipe$ = this.executionPipe$.pipe(
	// 		// tap(x => console.warn(">>>> executionPipe", this._canExecute)),
	// 		filter(() => this.$canExecute()),
	// 		tap(() => {
	// 			// console.log("[command::executionPipe$] do#1 - set execute", { args: x });
	// 			this.$isExecuting.set(true);
	// 		}),
	// 		mergeMap(args => coerceObservable(args ? execute(...args) : execute())),
	// 		finalize(() => {
	// 			// console.log("[command::executionPipe$]  finalize inner#1 - set idle");
	// 			this.$isExecuting.set(false);
	// 		}),
	// 		take(1), // todo: remove it must be completed
	// 		catchError(error => {
	// 			console.error("Unhandled execute error", error);
	// 			return EMPTY;
	// 		}),
	// 		tap(() => {
	// 			// console.log("[command::executionPipe$] tap#2 - set idle");
	// 			// this._isExecuting$.next(false);
	// 			this.$isExecuting.set(false);
	// 		}),
	// 	);
	// 	return pipe$;
	// }

}
