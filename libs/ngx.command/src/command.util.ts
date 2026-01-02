import { type AbstractControl, PristineChangeEvent, StatusChangeEvent } from "@angular/forms";
import { Observable, map, distinctUntilChanged, filter, combineLatest, of, defer, concat } from "rxjs";

import type { CommandCreator, ICommand } from "./command.model";
import { Command } from "./command";
import { type Signal, computed } from "@angular/core";

/** Determines whether the arg object is of type `Command`. */
export function isCommand(arg: unknown): arg is ICommand {
	return arg instanceof Command;
}

/** Determines whether the arg object is of type `CommandCreator`. */
export function isCommandCreator(arg: unknown): arg is CommandCreator {
	if (arg instanceof Command) {
		return false;
	} else if (isAssumedType<CommandCreator>(arg) && arg.execute && arg.host) {
		return true;
	}
	return false;
}

export interface CanExecuteFormOptions {
	/** Determines whether to check for validity. (defaults: true) */
	validity?: boolean;

	/** Determines whether to check whether UI has been touched. (defaults: true) */
	dirty?: boolean;
}

const CAN_EXECUTE_FORM_OPTIONS_DEFAULTS = Object.freeze<CanExecuteFormOptions>({
	validity: true,
	dirty: true,
})

/** Get can execute from form validity/pristine as an observable. */
export function canExecuteFromNgForm(
	form: AbstractControl,
	options?: CanExecuteFormOptions
): Observable<boolean> {
	const opts: CanExecuteFormOptions = options ?
		{ ...CAN_EXECUTE_FORM_OPTIONS_DEFAULTS, ...options }
		: CAN_EXECUTE_FORM_OPTIONS_DEFAULTS;

	const pristine$ = opts.dirty
		? concat(
			defer(() => of(form.pristine)),
			form.events.pipe(
				filter(x => x instanceof PristineChangeEvent),
				map(x => x.pristine),
			)
		).pipe(distinctUntilChanged(),)
		: of(true);

	const valid$ = opts.validity
		? concat(
			defer(() => of(form.valid)),
			form.events.pipe(
				filter(x => x instanceof StatusChangeEvent),
				map(x => x.status === "VALID"),
			)
		).pipe(distinctUntilChanged(),)
		: of(true);

	return combineLatest([pristine$, valid$]).pipe(
		map(([pristine, valid]) => !!(!opts.validity || valid) && !!(!opts.dirty || !pristine)),
		distinctUntilChanged(),
	);
}

/** Can executed based on valid/dirty signal inputs. */
export function canExecuteFromSignals(
	signals: { valid: Signal<boolean>, dirty: Signal<boolean> },
	options?: CanExecuteFormOptions
): Signal<boolean> {
	const opts: CanExecuteFormOptions = options ?
		{ ...CAN_EXECUTE_FORM_OPTIONS_DEFAULTS, ...options }
		: CAN_EXECUTE_FORM_OPTIONS_DEFAULTS;
	return computed(() => !!(!opts.validity || signals.valid()) && !!(!opts.dirty || signals.dirty()));
}


function isAssumedType<T = Record<string, unknown>>(x: unknown): x is Partial<T> {
	return x !== null && typeof x === "object";
}
