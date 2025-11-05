/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	Observable, Subscription, Subject, of, EMPTY,
	tap, filter, switchMap, catchError, finalize, take,
} from "rxjs";
import type { CanExecute, ExecuteAsyncFn, ExecuteFn, ICommand } from "./command.model";
import { assertInInjectionContext, computed, DestroyRef, inject, Injector, isSignal, signal, type Signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";

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
 *
 */
export class Command implements ICommand {

	/** Determines whether the command is currently executing, as a snapshot value. */
	get isExecuting(): boolean { return this.$isExecuting(); }

	/** Determines whether the command can execute or not, as a snapshot value. */
	get canExecute(): boolean { return this.$canExecute(); }

	/** Determines whether the command is currently executing, as a signal. */
	readonly $isExecuting = signal(false);

	/** Determines whether the command can execute or not, as a signal. */
	readonly $canExecute = computed(() => !this.$isExecuting() && this._$canExecute());

	// /** Determines whether the command is currently executing, as an observable. */
	// readonly isExecuting$ = toObservable(this.$isExecuting);

	// /** Determines whether the command can execute or not, as an observable. */
	// readonly canExecute$ = toObservable(this.$canExecute);

	private readonly _$canExecute: Signal<boolean>;

	/** Determines whether to auto destroy when having 0 subscribers. */
	autoDestroy = true;

	// private _isExecuting$ = new BehaviorSubject<boolean>(false);
	// private _isExecuting = false;
	// private _canExecute = true;
	private executionPipe$ = new Subject<unknown[] | undefined>();
	// private isExecuting$$ = Subscription.EMPTY;
	// private canExecute$$ = Subscription.EMPTY;
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
	) {
		if (canExecute$) {
			const canExecute = typeof canExecute$ === "function"
				? computed(canExecute$)
				: canExecute$;
			this._$canExecute = isSignal(canExecute) ? canExecute : toSignal(canExecute, { initialValue: false });
			// this.canExecute$ = combineLatest([
			// 	this._isExecuting$,
			// 	isSignal(canExecute$) ? toObservable(canExecute$) : canExecute$
			// ]).pipe(
			// 	map(([isExecuting, canExecuteResult]) => {
			// 		// console.log("[command::combineLatest$] update!", { isExecuting, canExecuteResult });
			// 		this._isExecuting = isExecuting;
			// 		this._canExecute = !isExecuting && !!canExecuteResult;
			// 		return this._canExecute;
			// 	}),
			// );
			// this.canExecute$$ = this.canExecute$.subscribe();
		} else {
			this._$canExecute = signal(true);
			// this.canExecute$ = this._isExecuting$.pipe(
			// 	map(x => {
			// 		const canExecute = !x;
			// 		this._canExecute = canExecute;
			// 		return canExecute;
			// 	})
			// );
			// this.isExecuting$$ = this._isExecuting$
			// 	.pipe(tap(x => this._isExecuting = x))
			// 	.subscribe();
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
		// this.canExecute$$.unsubscribe();
		// this.isExecuting$$.unsubscribe();
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
