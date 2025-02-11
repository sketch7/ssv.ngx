/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	Observable, combineLatest, Subscription, Subject, BehaviorSubject, of, EMPTY,
	tap, map, filter, switchMap, catchError, finalize, take,
} from "rxjs";
import type { ICommand } from "./command.model";
import { assertInInjectionContext, computed, DestroyRef, inject, Injector, isSignal, type Signal } from "@angular/core";
import { toObservable } from "@angular/core/rxjs-interop";

export type ExecuteFn = (...args: any[]) => unknown;
export type ExecuteAsyncFn = (...args: any[]) => Observable<unknown> | Promise<unknown>;
export type CanExecute = (() => boolean) | Signal<boolean> | Observable<boolean>;

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
	const cmd = new Command(execute, canExecute$, isAsync);
	cmd.autoDestroy = false;

	destroyRef.onDestroy(() => {
		// console.warn("[command::destroy]");
		cmd.destroy();
	});
	return cmd;
}

/**
 * Command object used to encapsulate information which is needed to perform an action.
 * @deprecated Use {@link command} or {@link commandAsync} instead.
 */
export class Command implements ICommand {

	/** Determines whether the command is currently executing, as a snapshot value. */
	get isExecuting(): boolean {
		return this._isExecuting;
	}

	/** Determines whether the command can execute or not, as a snapshot value. */
	get canExecute(): boolean {
		return this._canExecute;
	}

	/** Determines whether the command is currently executing, as an observable. */
	get isExecuting$(): Observable<boolean> {
		return this._isExecuting$.asObservable();
	}

	/** Determines whether to auto destroy when having 0 subscribers. */
	autoDestroy = true;

	/** Determines whether the command can execute or not, as an observable. */
	readonly canExecute$: Observable<boolean>;

	private _isExecuting$ = new BehaviorSubject<boolean>(false);
	private _isExecuting = false;
	private _canExecute = true;
	private executionPipe$ = new Subject<unknown[] | undefined>();
	private isExecuting$$ = Subscription.EMPTY;
	private canExecute$$ = Subscription.EMPTY;
	private executionPipe$$ = Subscription.EMPTY;
	private subscribersCount = 0;

	/**
	 * Creates an instance of Command.
	 *
	 * @param execute Execute function to invoke - use `isAsync: true` when `Observable<any>`.
	 * @param canExecute Observable which determines whether it can execute or not.
	 * @param isAsync Indicates that the execute function is async e.g. Observable.
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
			this.canExecute$ = combineLatest([
				this._isExecuting$,
				isSignal(canExecute) ? toObservable(canExecute, { injector }) : canExecute
			]).pipe(
				map(([isExecuting, canExecuteResult]) => {
					// console.log("[command::combineLatest$] update!", { isExecuting, canExecuteResult });
					this._isExecuting = isExecuting;
					this._canExecute = !isExecuting && !!canExecuteResult;
					return this._canExecute;
				}),
			);
			this.canExecute$$ = this.canExecute$.subscribe();
		} else {
			this.canExecute$ = this._isExecuting$.pipe(
				map(x => {
					const canExecute = !x;
					this._canExecute = canExecute;
					return canExecute;
				})
			);
			this.isExecuting$$ = this._isExecuting$
				.pipe(tap(x => this._isExecuting = x))
				.subscribe();
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
		this.canExecute$$.unsubscribe();
		this.isExecuting$$.unsubscribe();
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
			filter(() => this._canExecute),
			tap(() => {
				// console.log("[command::executionPipe$] do#1 - set execute", { args: x });
				this._isExecuting$.next(true);
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
					this._isExecuting$.next(false);
				}),
				take(1),
				catchError(error => {
					console.error("Unhandled execute error", error);
					return EMPTY;
				}),
			)),
			tap(
				() => {
					// console.log("[command::executionPipe$] tap#2 - set idle");
					this._isExecuting$.next(false);
				},
			)
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

	constructor(
		execute: ExecuteAsyncFn,
		canExecute$?: CanExecute,
	) {
		super(execute, canExecute$, true);
	}

}
