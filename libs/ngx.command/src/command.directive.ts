import {
	Directive,
	OnInit,
	ElementRef,
	Renderer2,
	ChangeDetectorRef,
	inject,
	effect,
	input,
	Injector,
	computed,
	linkedSignal,
	signal,
} from "@angular/core";

import { isObservable } from "rxjs";

import { type CommandOptions, COMMAND_OPTIONS } from "./command.options";
import { command } from "./command";
import { isCommand, isCommandCreator } from "./command.util";
import { CommandCreator, type ICommand, type CanExecute, type CanExecuteResult, type ExecuteFn, type CommandParams, type Simplify } from "./command.model";

/** Helper type to extract ExecuteFn from ICommand or use ExecuteFn directly */
type ExtractExecuteFn<T> = T extends ICommand<infer TExec>
	? TExec
	: T extends ExecuteFn
	? T
	: never;

const NAME_CAMEL = "ssvCommand";

/**
 * Controls the state of a component in sync with `Command`.
 *
 * @example
 * ### Most common usage
 * ```html
 * <button [ssvCommand]="saveCmd">Save</button>
 * ```
 *
 *
 * ### Usage with options
 * ```html
 * <button [ssvCommand]="saveCmd" [ssvCommandOptions]="{executingCssClass: 'in-progress'}">Save</button>
 * ```
 *
 *
 * ### Usage with params
 * This is useful for collections (loops) or using multiple actions with different args.
 * *NOTE: This will share the `isExecuting` when used with multiple controls.*
 *
 * #### With single param (direct)
 *
 * ```html
 * <button [ssvCommand]="saveCmd" [ssvCommandParams]="hero">Save</button>
 * ```
 *
 * #### With single param (array)
 *
 * ```html
 * <button [ssvCommand]="saveCmd" [ssvCommandParams]="[hero]">Save</button>
 * ```
 *
 * *NOTE: if you have only 1 argument as an array, it should be enclosed within an array e.g. `[['apple', 'banana']]`,
 * else it will spread and you will get `arg1: "apple", arg2: "banana"`*
 *
 * #### With multi params
 * ```html
 * <button [ssvCommand]="saveCmd" [ssvCommandParams]="[{id: 1}, 'hello', hero]">Save</button>
 * ```
 *
 * ### Usage with Command Creator
 * This is useful for collections (loops) or using multiple actions with different args, whilst not sharing `isExecuting`.
 *
 *
 * ```html
 * <button [ssvCommand]="{host: this, execute: removeHero$, canExecute: isValid$, params: [hero, 1337, 'xx']}">Save</button>
 * ```
 *
 */
@Directive({
	selector: `[${NAME_CAMEL}]`,
	host: {
		"[class]": "_hostClasses()",
		"(click)": "_handleClick()",
	},
	// todo: handle keydown/enter?
	exportAs: NAME_CAMEL,
	standalone: true,
})
export class SsvCommand<T extends ICommand | ExecuteFn = ExecuteFn> implements OnInit {

	readonly #options = inject(COMMAND_OPTIONS);
	readonly #renderer = inject(Renderer2);
	readonly #element = inject(ElementRef);
	readonly #cdr = inject(ChangeDetectorRef);
	readonly #injector = inject(Injector);

	/** The command, or a command creator; `undefined` is "no command yet": not executable, and a click does nothing. */
	readonly commandOrCreator = input.required<(T extends ICommand ? T : (ICommand<ExtractExecuteFn<T>> | CommandCreator<ExtractExecuteFn<T>>)) | undefined>({
		alias: `ssvCommand`
	});
	readonly ssvCommandOptions = input<Partial<CommandOptions>>(this.#options);
	readonly commandOptions = computed<CommandOptions>(() => {
		const value = this.ssvCommandOptions();
		if (value === this.#options) {
			return this.#options;
		}
		return {
			...this.#options,
			...value,
		};
	});
	readonly ssvCommandParams = input<Simplify<CommandParams<ExtractExecuteFn<T>>>>();
	readonly commandParams = computed(() => {
		const params = this.ssvCommandParams();
		if (params === undefined) {
			return this.#creatorParams();
		}
		// Normalize single param to array format for consistent handling
		return this.#normalizeParams(params as CommandParams<ExtractExecuteFn<T>>);
	});
	readonly _hostClasses = computed(() => ["ssv-command", this.#executingClass()]);
	readonly #executingClass = computed(() => this.#command()?.$isExecuting() ? this.commandOptions().executingCssClass : "");

	readonly #creatorParams = signal<Parameters<ExtractExecuteFn<T>> | undefined>(undefined);

	// the input is read from ngOnInit on, so reading `command()` earlier (e.g. while the host is created) gives undefined, not NG0950
	readonly #initialized = signal(false);
	// a bound command follows the input, so it can be swapped or cleared; a creator's command is built once, in ngOnInit
	readonly #command = linkedSignal<unknown, ICommand<ExtractExecuteFn<T>> | undefined>({
		source: () => this.#initialized() ? this.commandOrCreator() : undefined,
		computation: (source, previous) => source === undefined || isCommand<ICommand<ExtractExecuteFn<T>>>(source)
			? source
			: previous?.value,
	});
	/** The bound command (or the one built from a command creator): `undefined` until `ngOnInit`, or while none is bound. */
	readonly command = this.#command.asReadonly();

	constructor() {
		effect(() => {
			if (!this.#initialized()) {
				return;
			}
			this.trySetDisabled(!(this.#command()?.$canExecute() ?? false));
			this.#cdr.markForCheck();
		});
	}

	// todo: afterNextRender
	ngOnInit(): void {
		this.#initialized.set(true);
		const commandOrCreator = this.commandOrCreator();
		if (commandOrCreator === undefined || isCommand(commandOrCreator)) {
			// followed by #command
			return;
		} else if (isCommandCreator(commandOrCreator)) {
			this.#creatorParams.set(this.#normalizeParams(commandOrCreator.params as CommandParams<ExtractExecuteFn<T>>));

			const execFn = commandOrCreator.execute.bind(commandOrCreator.host) as ExtractExecuteFn<T>;
			const params = this.commandParams();

			let canExec: CanExecute | undefined;
			if (typeof commandOrCreator.canExecute === "function") {
				const boundFn = commandOrCreator.canExecute.bind(commandOrCreator.host) as (...args: unknown[]) => CanExecute;
				const args: unknown[] = Array.isArray(params) ? params : [];
				const result = boundFn(...args);
				// a boolean/reasons result is re-evaluated reactively (signals read inside are tracked), same as `command(fn, () => ...)`
				canExec = isObservable(result) || typeof result === "function"
					? result
					: () => boundFn(...args) as CanExecuteResult;
			} else {
				canExec = commandOrCreator.canExecute;
			}

			const cmd = command(execFn, canExec, { injector: this.#injector });
			this.#command.set(cmd);
		} else {
			throw new Error(`${NAME_CAMEL}: [${NAME_CAMEL}] is not defined properly!`);
		}
	}

	_handleClick(): void {
		const cmd = this.#command();
		if (!cmd) {
			return;
		}
		const commandParams = this.commandParams();
		if (Array.isArray(commandParams)) {
			cmd.execute(...commandParams);
		} else {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(cmd.execute as any)();
		}
	}

	private trySetDisabled(disabled: boolean) {
		if (this.commandOptions().handleDisabled) {
			this.#renderer.setProperty(this.#element.nativeElement, "disabled", disabled);
		}
	}

	/** Normalizes params to array format for consistent execution */
	#normalizeParams(params: CommandParams<ExtractExecuteFn<T>>): Parameters<ExtractExecuteFn<T>> | undefined {
		// If params is already an array, return as-is
		if (Array.isArray(params)) {
			return params as Parameters<ExtractExecuteFn<T>>;
		}
		// Single non-array param - wrap it
		return [params] as Parameters<ExtractExecuteFn<T>>;
	}

}
