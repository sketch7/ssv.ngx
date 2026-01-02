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
} from "@angular/core";

import { type CommandOptions, COMMAND_OPTIONS } from "./command.options";
import { command, type Command } from "./command";
import { isCommand, isCommandCreator } from "./command.util";
import { CommandCreator, type ICommand, type CanExecute, type ExecuteFn } from "./command.model";

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
 * #### With single param
 *
 * ```html
 * <button [ssvCommand]="saveCmd" [ssvCommandParams]="{id: 1}">Save</button>
 * ```
 * *NOTE: if you have only 1 argument as an array, it should be enclosed within an array e.g. `[['apple', 'banana']]`,
 * else it will spread and you will `arg1: "apple", arg2: "banana"`*
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

const NAME_CAMEL = "ssvCommand";

// let nextUniqueId = 0;

/** Helper type to extract ExecuteFn from ICommand/Command or use ExecuteFn directly */
type ExtractExecuteFn<T> = T extends Command<infer TExec>
	? TExec
	: T extends ICommand<infer TExec>
	? TExec
	: T extends ExecuteFn
	? T
	: never;

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

	// readonly id = `${NAME_CAMEL}-${nextUniqueId++}`;
	readonly #options = inject(COMMAND_OPTIONS);
	readonly #renderer = inject(Renderer2);
	readonly #element = inject(ElementRef);
	readonly #cdr = inject(ChangeDetectorRef);
	readonly #injector = inject(Injector);

	readonly commandOrCreator = input.required<T extends ICommand ? T : (ICommand<ExtractExecuteFn<T>> | CommandCreator<ExtractExecuteFn<T>>)>({
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
	readonly ssvCommandParams = input<Parameters<ExtractExecuteFn<T>>>();
	readonly commandParams = computed(() => this.ssvCommandParams() || this.creatorParams);
	readonly _hostClasses = computed(() => ["ssv-command", this.#executingClass()]);
	readonly #executingClass = computed(() => this.#command.$isExecuting() ? this.commandOptions().executingCssClass : "");

	private creatorParams: Parameters<ExtractExecuteFn<T>> | undefined;

	get command(): ICommand<ExtractExecuteFn<T>> { return this.#command; }

	#command!: ICommand<ExtractExecuteFn<T>>;

	constructor() {
		effect(() => {
			const canExecute = this.#command.$canExecute();
			this.trySetDisabled(!canExecute);
			// console.log("[ssvCommand::canExecute$]", { canExecute: x });
			this.#cdr.markForCheck();
		});
	}

	// todo: afterNextRender
	ngOnInit(): void {
		const commandOrCreator = this.commandOrCreator();
		// console.log("[ssvCommand::init]", this.#options);
		if (isCommand(commandOrCreator)) {
			this.#command = commandOrCreator;
		} else if (isCommandCreator(commandOrCreator)) {
			this.creatorParams = commandOrCreator.params as Parameters<ExtractExecuteFn<T>> | undefined;

			// todo: find something like this for ivy (or angular10+)
			// const hostComponent = (this.viewContainer as any)._view.component;

			const execFn = commandOrCreator.execute.bind(commandOrCreator.host) as ExtractExecuteFn<T>;
			const params = this.commandParams();

			let canExec: CanExecute | undefined;
			if (commandOrCreator.canExecute instanceof Function) {
				const boundFn = commandOrCreator.canExecute.bind(commandOrCreator.host);
				const result = Array.isArray(params) ? boundFn(...params) : boundFn();
				canExec = result as CanExecute;
			} else {
				canExec = commandOrCreator.canExecute;
			}

			// console.log("[ssvCommand::init] command creator", {
			// 	firstParam: params ? params[0] : null,
			// 	params
			// });

			this.#command = command(execFn, canExec, { injector: this.#injector });
		} else {
			throw new Error(`${NAME_CAMEL}: [${NAME_CAMEL}] is not defined properly!`);
		}
	}

	_handleClick(): void {
		const commandParams = this.commandParams();
		// console.log("[ssvCommand::onClick]", commandParams);
		if (Array.isArray(commandParams)) {
			this.#command.execute(...commandParams);
		} else {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(this.#command.execute as any)();
		}
	}

	private trySetDisabled(disabled: boolean) {
		if (this.commandOptions().handleDisabled) {
			// console.warn(">>>> disabled", { id: this.id, disabled });
			this.#renderer.setProperty(this.#element.nativeElement, "disabled", disabled);
		}
	}

}
