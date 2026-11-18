import { computed, signal, type Signal } from "@angular/core";
import { FormControl } from "@angular/forms";
import { of } from "rxjs";
import { expectTypeOf } from "vitest";

import type { CanExecute, CanExecuteResult, CommandCreator, CommandDisabledReason } from "./command.model";
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
