/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	Observable, Subscription, Subject, of, EMPTY,
	tap, filter, switchMap, catchError, finalize, take,
} from "rxjs";
import { toSignal } from "@angular/core/rxjs-interop";
import type { CanExecute, ExecuteAsyncFn, ExecuteFn, ICommand } from "./command.model";
import { assertInInjectionContext, computed, DestroyRef, inject, Injector, isSignal, signal, type Signal } from "@angular/core";

export interface CommandCreateOptions {
	isAsync: boolean,
	injector?: Injector;
}

const COMMAND_ASYNC_DEFAULT_OPTIONS: CommandCreateOptions = { isAsync: true };

/** Creates an async {@link Command}. Must be used within an injection context.
 * NOTE: this auto injects `DestroyRef` and handles auto destroy. {@link ICommand.autoDestroy} should not be used.
 */
export function commandAsync(
	execute: ExecuteAsyncFn,
	canExecute$?: CanExecute,
	opts?: Omit<CommandCreateOptions, "isAsync">,
): Command {
	return command(execute, canExecute$, opts ? { ...opts, ...COMMAND_ASYNC_DEFAULT_OPTIONS } : COMMAND_ASYNC_DEFAULT_OPTIONS);
}

/** Creates a {@link Command}. Must be used within an injection context.
 * NOTE: this auto injects `DestroyRef` and handles auto destroy. {@link ICommand.autoDestroy} should not be used.
 */
export function command(
	execute: ExecuteFn,
	canExecute$?: CanExecute,
	opts?: CommandCreateOptions,
): Command {
	if (!opts?.injector) {
		assertInInjectionContext(command);
	}
	const injector = opts?.injector ?? inject(Injector);
	const isAsync = opts?.isAsync ?? false;
	const destroyRef = injector.get(DestroyRef);
	const cmd = new Command(execute, canExecute$, isAsync, injector);
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
export class Command implements ICommand {

	get isExecuting(): boolean { return this.$isExecuting(); }

	get canExecute(): boolean { return this.$canExecute(); }

	readonly $isExecuting = signal(false);
	readonly $canExecute = computed(() => !this.$isExecuting() && this._$canExecute());

	private readonly _$canExecute: Signal<boolean>;

	autoDestroy = true;

	private executionPipe$ = new Subject<unknown[] | undefined>();
	private executionPipe$$ = Subscription.EMPTY;
	private subscribersCount = 0;

	/**
	 * Creates an instance of Command.
	 *
	 * @param execute Execute function to invoke - use `isAsync: true` when `Observable<any>`.
	 * @param canExecute Observable which determines whether it can execute or not.
	 * @param isAsync Indicates that the execute function is async e.g. Observable.
	 * @deprecated Use {@link command} or {@link commandAsync} instead for creating instances.
	 */
	constructor(
		execute: ExecuteFn,
		canExecute$?: CanExecute,
		isAsync?: boolean,
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
		this.executionPipe$$ = this.buildExecutionPipe(execute, isAsync).subscribe();
	}

	/** Execute function to invoke. */
	execute(...args: unknown[]): void {
		// console.warn("[command::execute]", args);
		this.executionPipe$.next(args);
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

	private buildExecutionPipe(execute: (...args: unknown[]) => any, isAsync?: boolean): Observable<unknown> {
		let pipe$ = this.executionPipe$.pipe(
			// tap(x => console.warn(">>>> executionPipe", this._canExecute)),
			filter(() => this.$canExecute()),
			tap(() => {
				// console.log("[command::executionPipe$] do#1 - set execute", { args: x });
				this.$isExecuting.set(true);
			})
		);

		const execFn = isAsync
			? switchMap<unknown[] | undefined, any[]>(args => {
				if (args) {
					return execute(...args);
				}
				return execute();
			})
			: tap((args: unknown[] | undefined) => {
				if (args) {
					execute(...args);
					return;
				}
				execute();
			});

		pipe$ = pipe$.pipe(
			switchMap(args => of(args).pipe(
				execFn,
				finalize(() => {
					// console.log("[command::executionPipe$]  finalize inner#1 - set idle");
					this.$isExecuting.set(false);
				}),
				take(1),
				catchError(error => {
					console.error("Unhandled execute error", error);
					return EMPTY;
				}),
			)),
			tap(() => {
				// console.log("[command::executionPipe$] tap#2 - set idle");
				// this._isExecuting$.next(false);
				this.$isExecuting.set(false);
			}),
		);
		return pipe$;
	}

}

/**
 * Async Command object used to encapsulate information which is needed to perform an action,
 * which takes an execute function as Observable/Promise.
 * @deprecated Use {@link commandAsync} instead.
 */
export class CommandAsync extends Command {

	/**
	 * @deprecated Use {@link commandAsync} instead to create an instance.
	 */
	constructor(
		execute: ExecuteAsyncFn,
		canExecute$?: CanExecute,
	) {
		super(execute, canExecute$, true);
	}

}
