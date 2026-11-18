import { type AbstractControl, PristineChangeEvent, StatusChangeEvent } from "@angular/forms";
import { Observable, map, distinctUntilChanged, filter, combineLatest, of, defer, concat } from "rxjs";

import type { CanExecuteResult, CommandCreator, CommandDisabledReason, ICommand } from "./command.model";
import { CommandImpl } from "./command";
import { type Signal, computed } from "@angular/core";

/** Determines whether the arg object is of type `Command`. */
export function isCommand<T extends ICommand>(arg: unknown | T): arg is T {
	return arg instanceof CommandImpl;
}

/** Determines whether the arg object is of type `CommandCreator`. */
export function isCommandCreator<T extends CommandCreator>(arg: unknown | T): arg is T {
	if (arg instanceof CommandImpl) {
		return false;
	} else if (isAssumedType<T>(arg) && arg.execute && arg.host) {
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

/** Disabled reason codes of {@link canExecuteFromNgForm} and {@link canExecuteFromSignals}. */
export const CommandFormReason = {
	/** The validity check is enabled and the form is invalid. */
	invalid: "form.invalid",
	/** The dirty check is enabled and nothing changed. */
	unchanged: "form.unchanged",
} as const;

const INVALID_REASON: CommandDisabledReason = Object.freeze({ code: CommandFormReason.invalid });
const UNCHANGED_REASON: CommandDisabledReason = Object.freeze({ code: CommandFormReason.unchanged });

function withDefaults(options?: CanExecuteFormOptions): CanExecuteFormOptions {
	return options ? { ...CAN_EXECUTE_FORM_OPTIONS_DEFAULTS, ...options } : CAN_EXECUTE_FORM_OPTIONS_DEFAULTS;
}

function formResult(opts: CanExecuteFormOptions, valid: boolean, dirty: boolean): CanExecuteResult {
	const reasons: CommandDisabledReason[] = [];
	if (opts.validity && !valid) {
		reasons.push(INVALID_REASON);
	}
	if (opts.dirty && !dirty) {
		reasons.push(UNCHANGED_REASON);
	}
	return reasons.length ? reasons : true;
}

/**
 * Can execute from form validity/pristine as an observable: `true`, or the reasons it cannot
 * (`form.invalid` then `form.unchanged`, see {@link CommandFormReason}).
 */
export function canExecuteFromNgForm(
	form: AbstractControl,
	options?: CanExecuteFormOptions
): Observable<CanExecuteResult> {
	const opts = withDefaults(options);

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

	// each distinct (valid, pristine) pair maps to a distinct result, so no further dedupe
	return combineLatest([pristine$, valid$]).pipe(
		map(([pristine, valid]) => formResult(opts, valid, !pristine)),
	);
}

/**
 * Can execute based on valid/dirty signal inputs: `true`, or the reasons it cannot
 * (`form.invalid` then `form.unchanged`, see {@link CommandFormReason}).
 */
export function canExecuteFromSignals(
	signals: { valid: Signal<boolean>, dirty: Signal<boolean> },
	options?: CanExecuteFormOptions
): Signal<CanExecuteResult> {
	const opts = withDefaults(options);
	return computed(() => formResult(opts, signals.valid(), signals.dirty()));
}

function isAssumedType<T = Record<string, unknown>>(x: unknown): x is Partial<T> {
	return x !== null && typeof x === "object";
}
