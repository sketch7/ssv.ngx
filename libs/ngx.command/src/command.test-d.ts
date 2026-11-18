import { computed, signal, type Signal } from "@angular/core";
import { FormControl } from "@angular/forms";
import { type Observable, of } from "rxjs";
import { expectTypeOf } from "vitest";

import type { CanExecute, CanExecuteResult, CommandCreator, CommandDisabledReason } from "./command.model";
import type * as api from "./index";
import type { Command } from "./index";
import type { SsvCommand } from "./command.directive";
import type { SsvCommandRef } from "./command-ref.directive";
import { canExecuteFromNgForm, canExecuteFromSignals } from "./command.util";

declare const isBanned: boolean;

describe("CanExecute", () => {
	it("accepts booleans and reasons", () => {
		expectTypeOf<true>().toExtend<CanExecute>();
		expectTypeOf<readonly CommandDisabledReason[]>().toExtend<CanExecuteResult>();
		expectTypeOf([{ code: "hero.banned" }]).toExtend<CanExecute>();
	});

	it("accepts signals, functions and observables", () => {
		expectTypeOf(signal(true)).toExtend<CanExecute>();
		expectTypeOf(computed(() => isBanned ? [{ code: "hero.banned" }] : true)).toExtend<CanExecute>();
		expectTypeOf(() => isBanned ? [{ code: "party.full", params: { max: 4 } }] : true).toExtend<CanExecute>();
		expectTypeOf(of([{ code: "hero.notOwner" }])).toExtend<CanExecute>();
		expectTypeOf(canExecuteFromSignals({ valid: signal(true), dirty: signal(true) })).toExtend<CanExecute>();
		expectTypeOf(canExecuteFromSignals({ valid: signal(true), dirty: signal(true) })).toEqualTypeOf<Signal<CanExecuteResult>>();
		expectTypeOf(canExecuteFromNgForm(new FormControl())).toExtend<CanExecute>();
		expectTypeOf(canExecuteFromNgForm(new FormControl())).toEqualTypeOf<Observable<CanExecuteResult>>();
	});

	it("rejects reasons without a code", () => {
		// @ts-expect-error `message` is not a reason; reasons carry a `code` and are translated by the UI
		const reasons: CanExecute = [{ message: "Hero is banned" }];
		expectTypeOf(reasons).not.toBeAny();
	});

	it("accepts reasons from a creator canExecute(...params)", () => {
		type Creator = CommandCreator<(hero: { banned: boolean }) => void>;
		expectTypeOf((hero: { banned: boolean }) => hero.banned ? [{ code: "hero.banned" }] : true)
			.toExtend<NonNullable<Creator["canExecute"]>>();
	});
});

describe("canExecuteFromSignals", () => {
	it("requires a signal for each enabled check", () => {
		// @ts-expect-error dirty is required while the dirty check is on
		canExecuteFromSignals({ valid: signal(true) });
		// @ts-expect-error valid is required while the validity check is on
		canExecuteFromSignals({ dirty: signal(true) });
		// @ts-expect-error dirty is required when only the validity check is turned off
		canExecuteFromSignals({}, { validity: false });
		// @ts-expect-error dirty is required when the option is not a literal false
		canExecuteFromSignals({ valid: signal(true) }, { dirty: true });
	});

	it("does not require the signal of a disabled check", () => {
		expectTypeOf(canExecuteFromSignals({ valid: signal(true) }, { dirty: false })).toEqualTypeOf<Signal<CanExecuteResult>>();
		expectTypeOf(canExecuteFromSignals({ dirty: signal(true) }, { validity: false })).toEqualTypeOf<Signal<CanExecuteResult>>();
		expectTypeOf(canExecuteFromSignals({}, { validity: false, dirty: false })).toEqualTypeOf<Signal<CanExecuteResult>>();
	});
});

describe("Command", () => {
	// guards the 6.0 rename: the old 5.x boolean getter names are now signals, so a missed `()` compiles and is always truthy
	it("exposes isExecuting, canExecute and disabledReasons as signals, not booleans", () => {
		expectTypeOf<Command["isExecuting"]>().toEqualTypeOf<Signal<boolean>>();
		expectTypeOf<Command["canExecute"]>().toEqualTypeOf<Signal<boolean>>();
		expectTypeOf<Command["disabledReasons"]>().toEqualTypeOf<Signal<readonly CommandDisabledReason[]>>();
		expectTypeOf<Command["isExecuting"]>().not.toEqualTypeOf<boolean>();
		expectTypeOf<Command["canExecute"]>().not.toEqualTypeOf<boolean>();
	});

	it("has no $-prefixed signals", () => {
		expectTypeOf<Command>().not.toHaveProperty("$isExecuting");
		expectTypeOf<Command>().not.toHaveProperty("$canExecute");
		expectTypeOf<Command>().not.toHaveProperty("$disabledReasons");
	});

	it("is the only command type: ICommand is removed", () => {
		// @ts-expect-error `ICommand` is removed, use `Command`
		expectTypeOf<api.ICommand>().toBeNever();
	});

	it("is a type: only command() creates instances", () => {
		// @ts-expect-error `Command` only refers to a type
		new Command(() => undefined);
	});
});

describe("SsvCommand", () => {
	it("types command as possibly undefined (it is until ngOnInit)", () => {
		expectTypeOf<SsvCommand["command"]>().toEqualTypeOf<Signal<Command | undefined>>();
	});
});

describe("SsvCommandRef", () => {
	it("types command as possibly undefined (it is until ngOnInit)", () => {
		expectTypeOf<SsvCommandRef["command"]>().toEqualTypeOf<Signal<Command | undefined>>();
	});
});
