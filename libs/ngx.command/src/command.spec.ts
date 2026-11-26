import { computed, createEnvironmentInjector, isSignal, signal } from "@angular/core";
import { BehaviorSubject, EMPTY, of, throwError } from "rxjs";
import { vi } from "vitest";

import { command } from "./command";
import * as api from "./index";
import type { CommandDisabledReason } from "./command.model";

interface Hero {
	name: string;
	power?: number;
}

describe("CommandSpecs", () => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const injector = createEnvironmentInjector([], null as any);

	afterAll(() => {
		injector?.destroy();
	});

	describe("public api", () => {
		it("should not export a Command class, only command() creates commands", () => {
			expect("Command" in api).toBe(false);
		});

		it("should expose the state as signals, without the $ prefix", () => {
			const cmd = command(vi.fn(), undefined, { injector });
			expect(isSignal(cmd.isExecuting)).toBe(true);
			expect(isSignal(cmd.canExecute)).toBe(true);
			expect(isSignal(cmd.disabledReasons)).toBe(true);
			expect("$isExecuting" in cmd).toBe(false);
			expect("$canExecute" in cmd).toBe(false);
			expect("$disabledReasons" in cmd).toBe(false);
		});
	});

	describe("given a command without canExecute$ param", () => {
		const executeFn = vi.fn();
		const cmd = command(executeFn, undefined, { injector });

		describe("when command is initialized", () => {
			it("should have canExecute set to true", () => {
				expect(cmd.canExecute()).toBe(true);
			});

			it("should have canExecute signal set to true", () => {
				expect(cmd.canExecute()).toBe(true);
			});
		});

		describe("when execute is invoked", () => {
			cmd.execute();

			it("should have isExecuting set to false after execute finishes", () => {
				expect(cmd.isExecuting()).toBe(false);
			});

			it("should have canExecute set to true after execute finishes", () => {
				expect(cmd.canExecute()).toBe(true);
			});

			it("should invoke execute function", () => {
				expect(executeFn).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe("given execute is invoked", () => {
		describe("when canExecute is true", () => {
			const executeFn = vi.fn();

			it("should invoke execute function passed", () => {
				const cmd = command(executeFn, () => true, { injector })
				cmd.execute();
				expect(executeFn).toHaveBeenCalledTimes(1);
			});
		});

		describe("when observable completes", () => {
			const executeFn = vi.fn().mockImplementation(() => EMPTY);

			it("should invoke multiple times", async () => {
				const cmd = command(executeFn, () => true, { injector })
				await cmd.execute();
				await cmd.execute();

				expect(cmd.isExecuting()).toBeFalsy();
				expect(executeFn).toHaveBeenCalledTimes(2);
			});
		});

		describe("when an error is thrown", () => {
			const _errorFn = console.error;
			const executeFn = vi.fn().mockImplementation(() => {
				throw new Error("Execution failed!");
			});
			beforeAll(() => {
				console.error = vi.fn();
			});

			it("should invoke multiple times", () => {
				const cmd = command(executeFn, () => true, { injector });
				expect(() => cmd.execute()).toThrow();
				expect(() => cmd.execute()).toThrow();
				expect(cmd.isExecuting()).toBeFalsy();
				expect(executeFn).toHaveBeenCalledTimes(2);
			});

			afterAll(() => {
				console.error = _errorFn;
			});
		});

		describe("when canExecute is false", () => {
			const executeFn = vi.fn();
			const cmd = command(executeFn, () => false, { injector });

			it("should not execute the provided execute function", () => {
				expect(() => cmd.execute()).toThrow();
				expect(executeFn).not.toHaveBeenCalled();
			});
		});
	});

	describe("given canExecute with an initial value of true", () => {
		const canExecute$ = new BehaviorSubject(true);
		const executeFn = vi.fn();
		const cmd = command(executeFn, canExecute$, { injector });

		it("should have canExecute set to true", () => {
			expect(cmd.canExecute()).toBe(true);
		});

		it("should have canExecute signal set to true", () => {
			expect(cmd.canExecute()).toBe(true);
		});

		describe("when the canExecute observable changes", () => {
			beforeEach(() => {
				canExecute$.next(false);
			});

			it("should update canExecute", () => {
				expect(cmd.canExecute()).toBe(false);
			});

			it("should update canExecute signal", () => {
				expect(cmd.canExecute()).toBe(false);
			});
		});
	});

	describe("given canExecute with an initial value of false", () => {
		const executeFn = vi.fn();
		const cmd = command(executeFn, new BehaviorSubject(false), { injector });

		it("should have canExecute set to false", () => {
			expect(cmd.canExecute()).toBe(false);
		});

		it("should have canExecute signal set to false", () => {
			expect(cmd.canExecute()).toBe(false);
		});
	});

	describe("given canExecute with a signal", () => {
		const canExecuteSignal = signal(true);
		const executeFn = vi.fn();
		const cmd = command(executeFn, canExecuteSignal, { injector });

		it("should have canExecute signal set to true", () => {
			expect(cmd.canExecute()).toBe(true);
		});

		describe("when the canExecute signal changes", () => {
			beforeEach(() => {
				canExecuteSignal.set(false);
			});

			it("should update canExecute signal", () => {
				expect(cmd.canExecute()).toBe(false);
			});
		});
	});

	describe("given canExecute with a computed signal", () => {
		const isValid = signal(false);
		const canExecuteComputed = computed(() => isValid());
		const executeFn = vi.fn();
		const cmd = command(executeFn, canExecuteComputed, { injector });

		it("should have canExecute signal set to false initially", () => {
			expect(cmd.canExecute()).toBe(false);
		});

		describe("when the computed signal changes to true", () => {
			beforeEach(() => {
				isValid.set(true);
			});

			it("should update canExecute signal to true", () => {
				expect(cmd.canExecute()).toBe(true);
			});
		});

		describe("when the computed signal changes back to false", () => {
			beforeEach(() => {
				isValid.set(false);
			});

			it("should update canExecute signal to false", () => {
				expect(cmd.canExecute()).toBe(false);
			});
		});
	});

	describe("given canExecute with a boolean", () => {
		const executeFn = vi.fn();
		const cmd = command(executeFn, false, { injector });

		it("should have canExecute signal set to false", () => {
			expect(cmd.canExecute()).toBe(false);
		});
	});

	describe("Typed Parameters", () => {
		describe("given a parameterless command", () => {
			it("should type execute with no parameters", () => {
				const execute = vi.fn(() => "result");
				const cmd = command(execute, undefined, { injector });

				const result = cmd.execute();

				expect(execute).toHaveBeenCalledTimes(1);
				expect(execute).toHaveBeenCalledWith();
				expect(result).toBe("result");
			});
		});

		describe("given a command with single typed parameter", () => {
			it("should infer parameter type correctly", () => {
				const execute = vi.fn((hero: Hero) => hero.name);
				const cmd = command(execute, undefined, { injector });

				const hero: Hero = { name: "Rexxar", power: 100 };
				const result = cmd.execute(hero);

				expect(execute).toHaveBeenCalledTimes(1);
				expect(execute).toHaveBeenCalledWith(hero);
				expect(result).toBe("Rexxar");
			});

			it("should enforce type safety at compile time", () => {
				const execute = (id: number) => `User ${id}`;
				const cmd = command(execute, undefined, { injector });

				const result = cmd.execute(42);
				// TypeScript would error on: cmd.execute("string");

				expect(result).toBe("User 42");
			});
		});

		describe("given a command with multiple typed parameters", () => {
			it("should infer all parameter types correctly", () => {
				const execute = vi.fn((hero: Hero, action: string, power: number) => {
					return `${hero.name} ${action} with ${power} power`;
				});
				const cmd = command(execute, undefined, { injector });

				const hero: Hero = { name: "Thrall" };
				const result = cmd.execute(hero, "attacks", 150);

				expect(execute).toHaveBeenCalledTimes(1);
				expect(execute).toHaveBeenCalledWith(hero, "attacks", 150);
				expect(result).toBe("Thrall attacks with 150 power");
			});
		});

		describe("given a command with array parameter", () => {
			it("should not spread array parameter", () => {
				const execute = vi.fn((heroes: Hero[]) => heroes.length);
				const cmd = command(execute, undefined, { injector });

				const heroes: Hero[] = [{ name: "Rexxar" }, { name: "Thrall" }];
				const result = cmd.execute(heroes);

				expect(execute).toHaveBeenCalledTimes(1);
				expect(execute).toHaveBeenCalledWith(heroes);
				expect(result).toBe(2);
			});
		});

		describe("given a command with optional parameters", () => {
			it("should handle optional parameters correctly", () => {
				const execute = vi.fn((name: string, title?: string) => {
					return title ? `${title} ${name}` : name;
				});
				const cmd = command(execute, undefined, { injector });

				const result1 = cmd.execute("Rexxar");
				const result2 = cmd.execute("Thrall", "Warchief");

				expect(result1).toBe("Rexxar");
				expect(result2).toBe("Warchief Thrall");
			});
		});
	});

	describe("Return Type Handling", () => {
		describe("given a synchronous command", () => {
			it("should return the value directly", () => {
				const execute = vi.fn((x: number) => x * 2);
				const cmd = command(execute, undefined, { injector });

				const result = cmd.execute(5);

				expect(result).toBe(10);
				expect(cmd.isExecuting()).toBe(false);
			});

			it("should return void for void functions", () => {
				const execute = vi.fn(() => { /* no return */ });
				const cmd = command(execute, undefined, { injector });

				const result = cmd.execute();

				expect(result).toBeUndefined();
			});
		});

		describe("given a Promise-based command", () => {
			const _errorFn = console.error;
			beforeEach(() => {
				console.error = vi.fn();
			});

			it("should return a Promise", async () => {
				const execute = vi.fn((id: number) => Promise.resolve({ id, name: "User" }));
				const cmd = command(execute, undefined, { injector });

				const resultPromise = cmd.execute(1);

				expect(cmd.isExecuting()).toBe(true);
				expect(resultPromise).toBeInstanceOf(Promise);
				const result = await resultPromise;
				expect(result).toEqual({ id: 1, name: "User" });
				expect(cmd.isExecuting()).toBe(false);
			});

			it("should stay executing for a promise of another realm, as a native async function under zone.js", async () => {
				// zone.js replaces the global Promise, so a native `async` result is not `instanceof Promise`
				let resolve!: (value: string) => void;
				const foreign: PromiseLike<string> = { then: (onfulfilled, onrejected) => new Promise<string>(r => resolve = r).then(onfulfilled, onrejected) };
				const cmd = command(() => foreign, undefined, { injector });

				const resultPromise = cmd.execute();

				expect(cmd.isExecuting()).toBe(true);
				resolve("done");
				expect(await resultPromise).toBe("done");
				expect(cmd.isExecuting()).toBe(false);
			});

			it("should handle Promise rejection", async () => {
				const execute = vi.fn(() => Promise.reject(new Error("Failed")));
				const cmd = command(execute, undefined, { injector });

				await expect(cmd.execute()).rejects.toThrow("Failed");
				expect(cmd.isExecuting()).toBe(false);
			});

			afterAll(() => {
				console.error = _errorFn;
			});
		});

		describe("given an Observable-based command", () => {
			const _errorFn = console.error;
			beforeEach(() => {
				console.error = vi.fn();
			});

			it("should return a Promise (converted from Observable)", async () => {
				const execute = vi.fn((value: string) => of({ result: value }));
				const cmd = command(execute, undefined, { injector });

				const result = cmd.execute("test");

				expect(cmd.isExecuting()).toBe(true);
				expect(result).toBeInstanceOf(Promise);

				const value = await result;
				expect(value).toEqual({ result: "test" });
				expect(cmd.isExecuting()).toBe(false);
			});

			it("should handle Observable errors (converted to Promise rejection)", async () => {
				const execute = vi.fn(() => throwError(() => new Error("Observable error")));
				const cmd = command(execute, undefined, { injector });

				await expect(async () => {
					await cmd.execute();
				}).rejects.toThrow("Observable error");
				expect(cmd.isExecuting()).toBe(false);
			});

			it("should complete isExecuting after observable completes", async () => {
				const execute = vi.fn(() => of(1, 2, 3));
				const cmd = command(execute, undefined, { injector });

				expect(cmd.isExecuting()).toBe(false);
				const result = cmd.execute();

				expect(result).toBeInstanceOf(Promise);
				// lastValueFrom returns the last emitted value (3 in this case)
				const value = await result;

				expect(value).toBe(3);
				expect(cmd.isExecuting()).toBe(false);
			});

			afterAll(() => {
				console.error = _errorFn;
			});
		});

		describe("given a complex return type", () => {
			it("should preserve complex object types", () => {
				interface ComplexResult {
					heroes: Hero[];
					count: number;
					metadata: { timestamp: Date };
				}

				const execute = vi.fn((): ComplexResult => ({
					heroes: [{ name: "Rexxar" }],
					count: 1,
					metadata: { timestamp: new Date() }
				}));

				const cmd = command(execute, undefined, { injector });
				const result = cmd.execute();

				expect(result.heroes).toHaveLength(1);
				expect(result.count).toBe(1);
				expect(result.metadata.timestamp).toBeInstanceOf(Date);
			});
		});
	});

	describe("disabled reasons", () => {
		const banned = { code: "hero.banned" } as const;
		const notOwner = { code: "hero.notOwner", params: { owner: "Thrall" } } as const;

		describe("given a constant canExecute result", () => {
			const noReasons = command(() => 1, undefined, { injector }).disabledReasons();

			it.each([
				["undefined", undefined],
				["true", true],
				["[]", []],
				["() => []", () => []],
			] as const)("should be enabled with the shared frozen empty reasons for %s", (_, canExecute) => {
				const cmd = command(() => 1, canExecute, { injector });
				expect(cmd.canExecute()).toBe(true);
				expect(cmd.disabledReasons()).toBe(noReasons);
				expect(Object.isFrozen(cmd.disabledReasons())).toBe(true);
			});

			it("should be disabled without reasons for false", () => {
				const cmd = command(() => 1, false, { injector });
				expect(cmd.canExecute()).toBe(false);
				expect(cmd.disabledReasons()).toBe(noReasons);
			});

			it("should be disabled with exactly the given reasons for a non-empty array", () => {
				const reasons = [banned, notOwner];
				const cmd = command(() => 1, reasons, { injector });
				expect(cmd.canExecute()).toBe(false);
				expect(cmd.disabledReasons()).toBe(reasons);
			});
		});

		describe("given a function reading a signal", () => {
			const isBanned = signal(true);
			const cmd = command(() => 1, () => isBanned() ? [banned] : true, { injector });

			it("should be disabled with the reasons while it returns some", () => {
				isBanned.set(true);
				expect(cmd.canExecute()).toBe(false);
				expect(cmd.disabledReasons()).toEqual([banned]);
				expect(() => cmd.execute()).toThrow();
			});

			it("should become enabled with no reasons when it returns true", () => {
				isBanned.set(false);
				expect(cmd.canExecute()).toBe(true);
				expect(cmd.disabledReasons()).toEqual([]);
			});
		});

		describe("given an observable of reasons", () => {
			it("should follow its emissions", () => {
				const canExecute$ = new BehaviorSubject<boolean | readonly CommandDisabledReason[]>([notOwner]);
				const cmd = command(() => 1, canExecute$, { injector });
				expect(cmd.canExecute()).toBe(false);
				expect(cmd.disabledReasons()).toEqual([notOwner]);

				canExecute$.next(true);
				expect(cmd.canExecute()).toBe(true);
				expect(cmd.disabledReasons()).toEqual([]);
			});
		});

		describe("when executing", () => {
			it("should not be able to execute, without adding a reason", async () => {
				const cmd = command(() => Promise.resolve(), true, { injector });
				const result = cmd.execute();
				expect(cmd.canExecute()).toBe(false);
				expect(cmd.disabledReasons()).toEqual([]);
				await result;
				expect(cmd.canExecute()).toBe(true);
			});
		});
	});
});
