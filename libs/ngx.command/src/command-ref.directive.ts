import { Directive, OnInit, OnDestroy, Input, inject, Injector, runInInjectionContext } from "@angular/core";

import type { ICommand, CommandCreator, CanExecute } from "./command.model";
import { isCommandCreator } from "./command.util";
import { Command } from "./command";

const NAME_CAMEL = "ssvCommandRef";

/**
 * Command creator ref, directive which allows creating Command in the template
 * and associate it to a command (in order to share executions).
 * @example
 * ### Most common usage
 * ```html
 * <div #actionCmd="ssvCommandRef" [ssvCommandRef]="{host: this, execute: removeHero$, canExecute: isValid$}">
 *    <button [ssvCommand]="actionCmd.command" [ssvCommandParams]="hero">
 *      Remove
 *    </button>
 *    <button [ssvCommand]="actionCmd.command" [ssvCommandParams]="hero">
 *       Remove
 *    </button>
 * </div>
 * ```
 *
 */
@Directive({
	selector: `[${NAME_CAMEL}]`,
	exportAs: NAME_CAMEL,
	standalone: true,
})
export class CommandRefDirective implements OnInit, OnDestroy {

	private readonly injector = inject(Injector);

	@Input(NAME_CAMEL) commandCreator: CommandCreator | undefined;

	get command(): ICommand { return this._command; }
	private _command!: ICommand;

	ngOnInit(): void {
		if (isCommandCreator(this.commandCreator)) {
			const commandCreator = this.commandCreator;
			const isAsync = commandCreator.isAsync || commandCreator.isAsync === undefined;

			const execFn = commandCreator.execute.bind(commandCreator.host);
			// todo: pass injector instead
			runInInjectionContext(this.injector, () => {
				this._command = new Command(execFn, commandCreator.canExecute as CanExecute, isAsync);
			});
		} else {
			throw new Error(`${NAME_CAMEL}: [${NAME_CAMEL}] is not defined properly!`);
		}
	}

	ngOnDestroy(): void {
		// console.log("[commandRef::destroy]");
		if (this._command) {
			this._command.destroy();
		}
	}

}
