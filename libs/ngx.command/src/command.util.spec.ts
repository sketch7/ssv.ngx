import { computed, signal } from "@angular/core";
import { FormControl, Validators } from "@angular/forms";
import { firstValueFrom } from "rxjs";

import type { CanExecuteResult } from "./command.model";
import { CommandFormReason, canExecuteFromNgForm, canExecuteFromSignals, type CanExecuteFormOptions } from "./command.util";

const invalid = { code: CommandFormReason.invalid };
const unchanged = { code: CommandFormReason.unchanged };

const canExecuteCases: [options: CanExecuteFormOptions | undefined, valid: boolean, dirty: boolean, expected: unknown][] = [
	[undefined, true, true, true],
	[undefined, false, true, [invalid]],
	[undefined, true, false, [unchanged]],
	[undefined, false, false, [invalid, unchanged]],
	[{ validity: false }, false, true, true],
	[{ validity: false }, false, false, [unchanged]],
	[{ dirty: false }, true, false, true],
	[{ dirty: false }, false, false, [invalid]],
	[{ validity: false, dirty: false }, false, false, true],
];

describe("canExecuteFromNgForm", () => {
	it.each(canExecuteCases)("with options %o, valid %s and dirty %s should be %o", async (options, valid, dirty, expected) => {
		const form = new FormControl(valid ? "Ahri" : "", Validators.required);
		if (dirty) {
			form.markAsDirty();
		}

		expect(await firstValueFrom(canExecuteFromNgForm(form, options))).toEqual(expected);
	});

	it("should follow the form", () => {
		const form = new FormControl("", Validators.required);
		const emitted: CanExecuteResult[] = [];
		canExecuteFromNgForm(form).subscribe(x => emitted.push(x));

		form.setValue("Ahri");
		form.markAsDirty();

		expect(emitted).toEqual([[invalid, unchanged], [unchanged], true]);
	});
});

describe("canExecuteFromSignals", () => {
	it.each(canExecuteCases)("with options %o, valid %s and dirty %s should be %o", (options, valid, dirty, expected) => {
		const canExecute = canExecuteFromSignals({ valid: signal(valid), dirty: signal(dirty) }, options);
		expect(canExecute()).toEqual(expected);
	});

	it("should follow the signals", () => {
		const valid = signal(false);
		const dirty = signal(false);
		const canExecute = canExecuteFromSignals({ valid, dirty });

		valid.set(true);
		expect(canExecute()).toEqual([unchanged]);

		dirty.set(true);
		expect(canExecute()).toBe(true);
	});

	it("should not need or read the dirty signal when the dirty check is off", () => {
		const valid = signal(false);
		const canExecute = canExecuteFromSignals({ valid }, { dirty: false });
		expect(canExecute()).toEqual([invalid]);

		const unread = computed<boolean>(() => { throw new Error("dirty read"); });
		expect(canExecuteFromSignals({ valid, dirty: unread }, { dirty: false })()).toEqual([invalid]);
	});

	it("should not need or read the valid signal when the validity check is off", () => {
		const dirty = signal(false);
		expect(canExecuteFromSignals({ dirty }, { validity: false })()).toEqual([unchanged]);

		const unread = computed<boolean>(() => { throw new Error("valid read"); });
		expect(canExecuteFromSignals({ valid: unread, dirty }, { validity: false })()).toEqual([unchanged]);
	});

	it("should return the same frozen reasons for the same outcome", () => {
		const valid = signal(false);
		const dirty = signal(false);
		const canExecute = canExecuteFromSignals({ valid, dirty });
		const both = canExecute();
		dirty.set(true);
		const invalidOnly = canExecute();
		valid.set(true);
		dirty.set(false);
		const unchangedOnly = canExecute();

		expect([both, invalidOnly, unchangedOnly].map(x => Object.isFrozen(x))).toEqual([true, true, true]);
		valid.set(false);
		expect(canExecute()).toBe(both);
		dirty.set(true);
		expect(canExecute()).toBe(invalidOnly);
		valid.set(true);
		dirty.set(false);
		expect(canExecute()).toBe(unchangedOnly);
		expect(canExecuteFromSignals({ valid: signal(false), dirty: signal(false) })()).toBe(both);
	});

	it("should expose the reason codes", () => {
		expect(CommandFormReason).toEqual({ invalid: "form.invalid", unchanged: "form.unchanged" });
	});
});
