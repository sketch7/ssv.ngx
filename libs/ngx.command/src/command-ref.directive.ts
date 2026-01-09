import { Directive, OnInit, inject, Injector, input, signal } from "@angular/core";

import type { ICommand, CommandCreator, CanExecute, ExecuteFn } from "./command.model";
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
 *    <button [ssvCommand]="actionCmd.command()" [ssvCommandParams]="[hero]">
 *      Remove
 *    </button>
 *    <button [ssvCommand]="actionCmd.command()" [ssvCommandParams]="[hero]">
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
export class SsvCommandRef<TExecute extends ExecuteFn = ExecuteFn> implements OnInit {

	readonly #injector = inject(Injector);

	readonly commandCreator = input.required<CommandCreator<TExecute>>({
		alias: `ssvCommandRef`
	});

	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	readonly #command = signal<ICommand<TExecute>>(undefined!);
	readonly command = this.#command.asReadonly();

	// todo: use afterNextRender
	ngOnInit(): void {
		const commandOrCreator = this.commandCreator();
		if (isCommandCreator(commandOrCreator)) {
			const commandCreator = commandOrCreator;

			const execFn = commandCreator.execute.bind(commandCreator.host) as TExecute;

			const cmd = command(execFn, commandCreator.canExecute as CanExecute, { injector: this.#injector });
			this.#command.set(cmd);
		} else {
			throw new Error(`${NAME_CAMEL}: [${NAME_CAMEL}] is not defined properly!`);
		}
	}

}
