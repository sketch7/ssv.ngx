import { computed, createEnvironmentInjector, isSignal, signal } from "@angular/core";
import { BehaviorSubject, EMPTY, of, Subject, throwError } from "rxjs";
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

	describe("withCommandLifecycle", () => {
		it("locks before start and forwards the original args and sync result once", () => {
			const heroes = [{ name: "Rexxar" }];
			const party = { heroes };
			const execute = vi.fn<(heroes: Hero[], leader?: string) => typeof party>(() => party);
			const source = command(execute, undefined, { injector });
			const onStart = vi.fn(() => {
				expect(decorated.isExecuting()).toBe(true);
				expect(decorated.canExecute()).toBe(false);
				expect(execute).not.toHaveBeenCalled();
				expect(() => decorated.execute(heroes)).toThrow();
			});
			const onSuccess = vi.fn(() => {
				expect(decorated.isExecuting()).toBe(true);
				expect(() => decorated.execute(heroes)).toThrow();
			});
			const onError = vi.fn();
			const decorated = api.withCommandLifecycle(source, { onStart, onSuccess, onError });
			const sourceExecute = vi.spyOn(source, "execute");

			expect(decorated.execute(heroes, "Jaina")).toBe(party);

			expect(sourceExecute).toHaveBeenCalledExactlyOnceWith(heroes, "Jaina");
			expect(sourceExecute.mock.calls[0][0]).toBe(heroes);
			expect(execute).toHaveBeenCalledExactlyOnceWith(heroes, "Jaina");
			expect(onStart).toHaveBeenCalledExactlyOnceWith({ params: [heroes, "Jaina"] });
			expect(onSuccess).toHaveBeenCalledExactlyOnceWith({ params: [heroes, "Jaina"], result: party });
			expect(onError).not.toHaveBeenCalled();
			expect(decorated.canExecute()).toBe(true);
		});

		it("settles a foreign thenable without waiting for promises returned by hooks", async () => {
			const result = { name: "Jaina" };
			const pendingHook = new Promise<void>(() => {
				// Keep the hook pending while the command settles.
			});
			const execute = () => ({
				then: (resolve: (hero: Hero) => void) => resolve(result),
			});
			const source = command(execute, undefined, { injector });
			const onStart = vi.fn(() => pendingHook);
			const onSuccess = vi.fn(() => pendingHook);
			const onError = vi.fn();
			const decorated = api.withCommandLifecycle(source, { onStart, onSuccess, onError });

			const execution = decorated.execute();
			expect(decorated.isExecuting()).toBe(true);
			expect(onStart).toHaveBeenCalledOnce();
			expect(onSuccess).not.toHaveBeenCalled();

			await expect(Promise.resolve(execution)).resolves.toBe(result);
			expect(onSuccess).toHaveBeenCalledExactlyOnceWith({ params: [], result });
			expect(onError).not.toHaveBeenCalled();
			expect(decorated.isExecuting()).toBe(false);
		});

		const last = { name: "Jaina" };
		it.each([
			{ name: "the last value", emissions: [{ name: "Rexxar" }, last], expected: last },
			{ name: "undefined on empty completion", emissions: [], expected: undefined },
		])("calls success only after Observable completion, with $name", async ({ emissions, expected }) => {
			const heroes = new Subject<Hero>();
			const source = command(() => heroes, undefined, { injector });
			const onSuccess = vi.fn();
			const decorated = api.withCommandLifecycle(source, { onSuccess });

			const execution = decorated.execute();
			emissions.forEach(hero => heroes.next(hero));
			await Promise.resolve();
			expect(onSuccess).not.toHaveBeenCalled();
			expect(decorated.isExecuting()).toBe(true);

			heroes.complete();
			await expect(execution).resolves.toBe(expected);
			expect(onSuccess).toHaveBeenCalledExactlyOnceWith({ params: [], result: expected });
			expect(decorated.isExecuting()).toBe(false);
		});

		it("calls error and rethrows the original synchronous error", () => {
			const error = new Error("Rift unavailable");
			const execute = vi.fn<(hero: Hero) => never>(() => {
				throw error;
			});
			const source = command(execute, undefined, { injector });
			const onError = vi.fn(() => expect(decorated.isExecuting()).toBe(true));
			const onSuccess = vi.fn();
			const decorated = api.withCommandLifecycle(source, { onSuccess, onError });
			const hero = { name: "Rexxar" };

			expect(() => decorated.execute(hero)).toThrow(expect.toSatisfy(value => value === error));
			expect(onError).toHaveBeenCalledExactlyOnceWith({ params: [hero], error });
			expect(onSuccess).not.toHaveBeenCalled();
			expect(decorated.canExecute()).toBe(true);
		});

		it.each([
			{ kind: "Promise", fail: (error: Error) => Promise.reject(error) },
			{ kind: "Observable", fail: (error: Error) => throwError(() => error) },
		])("calls error and preserves the original $kind rejection", async ({ fail }) => {
			const error = new Error("Rift unavailable");
			const source = command(() => fail(error), undefined, { injector });
			const onError = vi.fn(() => expect(decorated.isExecuting()).toBe(true));
			const onSuccess = vi.fn();
			const decorated = api.withCommandLifecycle(source, { onSuccess, onError });

			await expect(decorated.execute()).rejects.toBe(error);
			expect(onError).toHaveBeenCalledExactlyOnceWith({ params: [], error });
			expect(onSuccess).not.toHaveBeenCalled();
			expect(decorated.canExecute()).toBe(true);
		});

		it.each([
			{ sync: true, name: "onStart", hook: "onStart", source: () => undefined, ran: 0 },
			{ sync: true, name: "onSuccess", hook: "onSuccess", source: () => undefined, ran: 1 },
			{
				sync: true,
				name: "onError",
				hook: "onError",
				source: () => {
					throw new Error("Action failed");
				},
				ran: 1,
			},
			{ sync: false, name: "onSuccess after a Promise resolves", hook: "onSuccess", source: () => Promise.resolve("Rexxar"), ran: 1 },
			{ sync: false, name: "onError after a Promise rejects", hook: "onError", source: () => Promise.reject(new Error("Action failed")), ran: 1 },
		] as const)("propagates a throw from $name and releases the lock", async ({ hook, source: action, ran, sync }) => {
			const failure = new Error("Hook failed");
			const execute = vi.fn(action);
			const source = command(execute, undefined, { injector });
			const throwFromHook = vi.fn(() => {
				throw failure;
			});
			const otherHook = vi.fn();
			const decorated = api.withCommandLifecycle(source, { onError: otherHook, [hook]: throwFromHook });

			if (sync) {
				expect(() => decorated.execute()).toThrow(expect.toSatisfy(value => value === failure));
			} else {
				await expect(decorated.execute()).rejects.toBe(failure);
			}

			expect(throwFromHook).toHaveBeenCalledOnce();
			expect(execute).toHaveBeenCalledTimes(ran);
			expect(decorated.isExecuting()).toBe(false);
			expect(decorated.canExecute()).toBe(true);
		});

		it("shares live reasons and skips hooks when the source is disabled", () => {
			const guard = new BehaviorSubject<boolean | readonly CommandDisabledReason[]>(false);
			const execute = vi.fn();
			const source = command(execute, guard, { injector });
			const onStart = vi.fn();
			const onSuccess = vi.fn();
			const onError = vi.fn();
			const decorated = api.withCommandLifecycle(source, { onStart, onSuccess, onError });
			const reasons = [{ code: "hero.banned" }];

			expect(decorated.disabledReasons).toBe(source.disabledReasons);
			expect(decorated.disabledReasons()).toEqual([]);
			expect(decorated.canExecute()).toBe(false);
			expect(() => decorated.execute()).toThrow();
			guard.next(reasons);
			expect(decorated.disabledReasons()).toBe(reasons);
			expect(decorated.canExecute()).toBe(false);
			expect(() => decorated.execute()).toThrow();
			guard.next([]);
			expect(decorated.canExecute()).toBe(true);
			expect(execute).not.toHaveBeenCalled();
			expect(onStart).not.toHaveBeenCalled();
			expect(onSuccess).not.toHaveBeenCalled();
			expect(onError).not.toHaveBeenCalled();
		});

		it("shares the source guard across decorators and keeps hooks local", async () => {
			const execute = vi.fn(() => Promise.resolve("Rexxar"));
			const source = command(execute, undefined, { injector });
			const firstStart = vi.fn();
			const secondStart = vi.fn();
			const secondSuccess = vi.fn();
			const secondError = vi.fn();
			const first = api.withCommandLifecycle(source, { onStart: firstStart });
			const second = api.withCommandLifecycle(source, {
				onStart: secondStart,
				onSuccess: secondSuccess,
				onError: secondError,
			});

			const firstRun = first.execute();
			expect(first.isExecuting()).toBe(true);
			expect(second.isExecuting()).toBe(false);
			expect(second.canExecute()).toBe(false);
			expect(second.disabledReasons()).toEqual([]);
			expect(() => second.execute()).toThrow();
			expect(() => source.execute()).toThrow();
			await firstRun;

			const directRun = source.execute();
			expect(first.isExecuting()).toBe(false);
			expect(() => first.execute()).toThrow();
			await directRun;
			expect(firstStart).toHaveBeenCalledOnce();
			expect(secondStart).not.toHaveBeenCalled();
			expect(secondSuccess).not.toHaveBeenCalled();
			expect(secondError).not.toHaveBeenCalled();

			await second.execute();
			expect(secondStart).toHaveBeenCalledOnce();
			expect(secondSuccess).toHaveBeenCalledOnce();
			expect(firstStart).toHaveBeenCalledOnce();
			expect(execute).toHaveBeenCalledTimes(3);
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
