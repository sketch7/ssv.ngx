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

export type CommandFormReason = (typeof CommandFormReason)[keyof typeof CommandFormReason];

const INVALID_REASON: CommandDisabledReason = Object.freeze({ code: CommandFormReason.invalid });
const UNCHANGED_REASON: CommandDisabledReason = Object.freeze({ code: CommandFormReason.unchanged });
// shared, so an unchanged outcome keeps its identity (no new array per evaluation)
const INVALID_ONLY: readonly CommandDisabledReason[] = Object.freeze([INVALID_REASON]);
const UNCHANGED_ONLY: readonly CommandDisabledReason[] = Object.freeze([UNCHANGED_REASON]);
const INVALID_AND_UNCHANGED: readonly CommandDisabledReason[] = Object.freeze([INVALID_REASON, UNCHANGED_REASON]);

function withDefaults(options?: CanExecuteFormOptions): CanExecuteFormOptions {
	return options ? { ...CAN_EXECUTE_FORM_OPTIONS_DEFAULTS, ...options } : CAN_EXECUTE_FORM_OPTIONS_DEFAULTS;
}

function formResult(opts: CanExecuteFormOptions, valid: boolean, dirty: boolean): CanExecuteResult {
	const isInvalid = opts.validity && !valid;
	const isUnchanged = opts.dirty && !dirty;
	if (isInvalid) {
		return isUnchanged ? INVALID_AND_UNCHANGED : INVALID_ONLY;
	}
	return isUnchanged ? UNCHANGED_ONLY : true;
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

/** The signal of each enabled check: a check turned off with `false` in the options needs none. */
type FormSignals<TOptions extends CanExecuteFormOptions> =
	(TOptions extends { validity: false } ? { valid?: Signal<boolean> } : { valid: Signal<boolean> })
	& (TOptions extends { dirty: false } ? { dirty?: Signal<boolean> } : { dirty: Signal<boolean> });

/**
 * Can execute based on valid/dirty signal inputs: `true`, or the reasons it cannot
 * (`form.invalid` then `form.unchanged`, see {@link CommandFormReason}).
 * A check turned off in the options needs no signal, and its signal is never read.
 */
export function canExecuteFromSignals<const TOptions extends CanExecuteFormOptions = CanExecuteFormOptions>(
	signals: FormSignals<TOptions>,
	options?: TOptions
): Signal<CanExecuteResult> {
	const opts = withDefaults(options);
	// a missing signal of an enabled check (untyped callers) fails the check rather than passing it
	return computed(() => formResult(opts, !opts.validity || (signals.valid?.() ?? false), !opts.dirty || (signals.dirty?.() ?? false)));
}

function isAssumedType<T = Record<string, unknown>>(x: unknown): x is Partial<T> {
	return x !== null && typeof x === "object";
}
