import { Directive, OnInit, inject, Injector, input } from "@angular/core";

import type { ICommand, CommandCreator, CanExecute } from "./command.model";
import { isCommandCreator } from "./command.util";
import { command } from "./command";

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
export class SsvCommandRef implements OnInit {

	readonly #injector = inject(Injector);

	readonly commandCreator = input.required<CommandCreator>({
		alias: `ssvCommandRef`
	});

	get command(): ICommand { return this._command; }
	private _command!: ICommand;

	constructor() {
		// const destroyRef = inject(DestroyRef);
		// destroyRef.onDestroy(() => {
		// 	this._command?.unsubscribe();
		// });
	}

	// todo: use afterNextRender
	ngOnInit(): void {
		if (isCommandCreator(this.commandCreator())) {
			const commandCreator = this.commandCreator();

			const execFn = commandCreator.execute.bind(commandCreator.host);

			this._command = command(execFn, commandCreator.canExecute as CanExecute, { injector: this.#injector });
		} else {
			throw new Error(`${NAME_CAMEL}: [${NAME_CAMEL}] is not defined properly!`);
		}
	}

}
