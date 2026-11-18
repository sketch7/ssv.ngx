import { signal } from "@angular/core";
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

	it("should expose the reason codes", () => {
		expect(CommandFormReason).toEqual({ invalid: "form.invalid", unchanged: "form.unchanged" });
	});
});
