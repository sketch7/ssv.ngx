import { Directive, OnInit, inject, Injector, input, signal } from "@angular/core";

import type { Command, CommandCreator, ExecuteFn } from "./command.model";
import { commandFromCreator, isCommandCreator } from "./command.util";

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

	/** Built like `ssvCommand`'s creator, but without params: each `ssvCommand` passes its own `[ssvCommandParams]`, and a `canExecute` function is called with none. */
	readonly commandCreator = input.required<CommandCreator<TExecute>>({
		alias: `ssvCommandRef`
	});

	readonly #command = signal<Command<TExecute> | undefined>(undefined);
	/** The created command: `undefined` until `ngOnInit`; `[ssvCommand]` accepts that as "no command yet". */
	readonly command = this.#command.asReadonly();

	// todo: use afterNextRender
	ngOnInit(): void {
		const commandCreator = this.commandCreator();
		if (isCommandCreator(commandCreator)) {
			this.#command.set(commandFromCreator(commandCreator, this.#injector));
		} else {
			throw new Error(`${NAME_CAMEL}: [${NAME_CAMEL}] is not defined properly!`);
		}
	}

}
