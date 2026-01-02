import { createEnvironmentInjector } from "@angular/core";
import { BehaviorSubject, EMPTY, lastValueFrom, of, throwError } from "rxjs";
import { vi } from "vitest";

// todo: remove commandAsync usages
import { command, commandAsync } from "./command";

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

	describe("given a command without canExecute$ param", () => {
		const executeFn = vi.fn();
		const cmd = command(executeFn, undefined, { injector });

		describe("when command is initialized", () => {
			it("should have canExecute set to true", () => {
				expect(cmd.canExecute).toBe(true);
			});

			it("should have $canExecute signal set to true", () => {
				expect(cmd.$canExecute()).toBe(true);
			});
		});

		describe("when execute is invoked", () => {
			cmd.execute();

			it("should have isExecuting set to false after execute finishes", () => {
				expect(cmd.isExecuting).toBe(false);
			});

			it("should have canExecute set to true after execute finishes", () => {
				expect(cmd.canExecute).toBe(true);
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
				const cmd = commandAsync(executeFn, () => true, { injector })
				await lastValueFrom(cmd.execute(), { defaultValue: undefined });
				await lastValueFrom(cmd.execute(), { defaultValue: undefined });

				expect(cmd.isExecuting).toBeFalsy();
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
				expect(cmd.isExecuting).toBeFalsy();
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
				cmd.execute();
				expect(executeFn).not.toHaveBeenCalled();
			});
		});
	});

	describe("given canExecute with an initial value of true", () => {
		const canExecute$ = new BehaviorSubject(true);
		const executeFn = vi.fn();
		const cmd = command(executeFn, canExecute$, { injector });

		it("should have canExecute set to true", () => {
			expect(cmd.canExecute).toBe(true);
		});

		it("should have $canExecute signal set to true", () => {
			expect(cmd.$canExecute()).toBe(true);
		});

		describe("when the canExecute observable changes", () => {
			beforeEach(() => {
				canExecute$.next(false);
			});

			it("should update canExecute", () => {
				expect(cmd.canExecute).toBe(false);
			});

			it("should update $canExecute signal", () => {
				expect(cmd.$canExecute()).toBe(false);
			});
		});
	});

	describe("given canExecute with an initial value of false", () => {
		const executeFn = vi.fn();
		const cmd = command(executeFn, new BehaviorSubject(false), { injector });

		it("should have canExecute set to false", () => {
			expect(cmd.canExecute).toBe(false);
		});

		it("should have $canExecute signal set to false", () => {
			expect(cmd.$canExecute()).toBe(false);
		});
	});

	describe("given destroy is invoked", () => {
		const executeFn = vi.fn();
		const cmd = command(executeFn, () => false, { injector });

		it("should destroy successfully", () => {
			cmd.destroy();
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
				expect(cmd.isExecuting).toBe(false);
			});

			it("should return void for void functions", () => {
				const execute = vi.fn(() => { /* no return */ });
				const cmd = command(execute, undefined, { injector });

				const result = cmd.execute();

				expect(result).toBeUndefined();
			});
		});

		describe("given a Promise-based command", () => {
			it("should return a Promise", async () => {
				const execute = vi.fn((id: number) => Promise.resolve({ id, name: "User" }));
				const cmd = command(execute, undefined, { injector });

				const resultPromise = cmd.execute(1);

				expect(resultPromise).toBeInstanceOf(Promise);
				const result = await resultPromise;
				expect(result).toEqual({ id: 1, name: "User" });
				expect(cmd.isExecuting).toBe(false);
			});

			it("should handle Promise rejection", async () => {
				const execute = vi.fn(() => Promise.reject(new Error("Failed")));
				const cmd = command(execute, undefined, { injector });

				await expect(cmd.execute()).rejects.toThrow("Failed");
				expect(cmd.isExecuting).toBe(false);
			});
		});

		describe("given an Observable-based command", () => {
			it("should return an Observable", () => {
				const execute = vi.fn((value: string) => of({ result: value }));
				const cmd = commandAsync(execute, undefined, { injector });

				const result$ = cmd.execute("test");

				expect(result$).toHaveProperty("subscribe");

				return new Promise<void>((resolve) => {
					result$.subscribe({
						next: (value) => {
							expect(value).toEqual({ result: "test" });
						},
						complete: () => {
							expect(cmd.isExecuting).toBe(false);
							resolve();
						}
					});
				});
			});

			it("should handle Observable errors", () => {
				const execute = vi.fn(() => throwError(() => new Error("Observable error")));
				const cmd = commandAsync(execute, undefined, { injector });

				const result$ = cmd.execute();

				return new Promise<void>((resolve) => {
					result$.subscribe({
						error: (err) => {
							expect(err.message).toBe("Observable error");
							expect(cmd.isExecuting).toBe(false);
							resolve();
						}
					});
				});
			});

			it("should complete isExecuting after observable completes", () => {
				const execute = vi.fn(() => of(1, 2, 3));
				const cmd = commandAsync(execute, undefined, { injector });

				expect(cmd.isExecuting).toBe(false);
				const result$ = cmd.execute();

				return new Promise<void>((resolve) => {
					const values: number[] = [];
					result$.subscribe({
						next: (value) => values.push(value),
						complete: () => {
							expect(values).toEqual([1, 2, 3]);
							expect(cmd.isExecuting).toBe(false);
							resolve();
						}
					});
				});
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
});
