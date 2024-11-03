import {
	Directive,
	OnInit,
	OnDestroy,
	HostListener,
	ElementRef,
	Renderer2,
	ChangeDetectorRef,
	inject,
	effect,
	input,
	Injector,
	runInInjectionContext,
	computed,
} from "@angular/core";

import { type CommandOptions, COMMAND_OPTIONS } from "./command.options";
import { Command } from "./command";
import { isCommand, isCommandCreator } from "./command.util";
import { CommandCreator, type ICommand } from "./command.model";

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

@Directive({
	selector: `[${NAME_CAMEL}]`,
	exportAs: NAME_CAMEL,
	standalone: true,
})
export class CommandDirective implements OnInit, OnDestroy {

	// readonly id = `${NAME_CAMEL}-${nextUniqueId++}`;
	private readonly globalOptions = inject(COMMAND_OPTIONS);
	private readonly renderer = inject(Renderer2);
	private readonly element = inject(ElementRef);
	private readonly cdr = inject(ChangeDetectorRef);
	private readonly injector = inject(Injector);

	readonly commandOrCreator = input<ICommand | CommandCreator | undefined>(undefined, { alias: `ssvCommand` });
	readonly ssvCommandOptions = input<Partial<CommandOptions>>(this.globalOptions);
	readonly commandOptions = computed<CommandOptions>(() => {
		const value = this.ssvCommandOptions();
		if (value === this.globalOptions) {
			return this.globalOptions;
		}
		return {
			...this.globalOptions,
			...value,
		};
	});
	readonly ssvCommandParams = input<unknown | unknown[]>(undefined);
	readonly commandParams = computed<unknown | unknown[]>(() => this.ssvCommandParams() || this.creatorParams);
	private creatorParams: unknown | unknown[] = [];

	get command(): ICommand { return this._command; }

	private _command!: ICommand;

	constructor() {
		effect(() => {
			const canExecute = this._command.$canExecute();
			this.trySetDisabled(!canExecute);
			// console.log("[ssvCommand::canExecute$]", { canExecute: x });
			this.cdr.markForCheck();
		});
		effect(() => {
			// console.log("[ssvCommand::isExecuting$]", x, this.commandOptions);
			if (this._command.$isExecuting()) {
				this.renderer.addClass(
					this.element.nativeElement,
					this.commandOptions().executingCssClass
				);
			} else {
				this.renderer.removeClass(
					this.element.nativeElement,
					this.commandOptions().executingCssClass
				);
			}
		});
	}

	ngOnInit(): void {
		const commandOrCreator = this.commandOrCreator();
		// console.log("[ssvCommand::init]", this.globalOptions);
		if (!commandOrCreator) {
			throw new Error(`${NAME_CAMEL}: [${NAME_CAMEL}] should be defined!`);
		} else if (isCommand(commandOrCreator)) {
			this._command = commandOrCreator;
		} else if (isCommandCreator(commandOrCreator)) {
			const isAsync = commandOrCreator.isAsync || commandOrCreator.isAsync === undefined;
			this.creatorParams = commandOrCreator.params;

			// todo: find something like this for ivy (or angular10+)
			// const hostComponent = (this.viewContainer as any)._view.component;

			const execFn = commandOrCreator.execute.bind(commandOrCreator.host);
			const params = this.commandParams();

			const canExec = commandOrCreator.canExecute instanceof Function
				? commandOrCreator.canExecute.bind(commandOrCreator.host, params)()
				: commandOrCreator.canExecute;

			// console.log("[ssvCommand::init] command creator", {
			// 	firstParam: params ? params[0] : null,
			// 	params
			// });
			// todo: pass injector instead
			runInInjectionContext(this.injector, () => {
				this._command = new Command(execFn, canExec, isAsync);
			});
		} else {
			throw new Error(`${NAME_CAMEL}: [${NAME_CAMEL}] is not defined properly!`);
		}

		this._command.subscribe();
	}

	@HostListener("click")
	onClick(): void {
		const commandParams = this.commandParams();
		// console.log("[ssvCommand::onClick]", commandParams);
		if (Array.isArray(commandParams)) {
			this._command.execute(...commandParams);
		} else {
			this._command.execute(commandParams);
		}
	}

	ngOnDestroy(): void {
		// console.log("[ssvCommand::destroy]");
		this._command?.unsubscribe();
	}

	private trySetDisabled(disabled: boolean) {
		if (this.commandOptions().handleDisabled) {
			// console.warn(">>>> disabled", { id: this.id, disabled });
			this.renderer.setProperty(this.element.nativeElement, "disabled", disabled);
		}
	}

}

