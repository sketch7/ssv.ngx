import { createEnvironmentInjector, EnvironmentInjector } from "@angular/core";
import { BehaviorSubject, EMPTY, type Observable } from "rxjs";
import { vi, type Mock } from "vitest";

import { Command, command, commandAsync } from "./command";

describe("CommandSpecs", () => {
	let SUT: Command;
	let executeFn: Mock<(...args: unknown[]) => void>;
	let asyncExecuteFn: Mock<(...args: unknown[]) => Observable<unknown>>;
	let injector: EnvironmentInjector;
	// let executeSpyFn: SpyInstance;

	beforeEach(() => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		injector = createEnvironmentInjector([], null as any);
		executeFn = vi.fn();
		// executeSpyFn = executeFn;
	});

	afterEach(() => {
		injector?.destroy();
	});

	describe("given a command without canExecute$ param", () => {
		beforeEach(() => {
			SUT = command(executeFn, undefined, { injector, isAsync: false });
			// executeSpyFn = jest.spyOn(SUT, "execute");
		});

		describe("when command is initialized", () => {
			it("should have canExecute set to true", () => {
				expect(SUT.canExecute).toBe(true);
			});

			it("should have $canExecute signal set to true", () => {
				expect(SUT.$canExecute()).toBe(true);
			});
		});

		describe("when execute is invoked", () => {
			beforeEach(() => {
				SUT.execute();
			});

			it("should have isExecuting set to false after execute finishes", () => {
				expect(SUT.isExecuting).toBe(false);
			});

			it("should have canExecute set to true after execute finishes", () => {
				expect(SUT.canExecute).toBe(true);
			});

			it("should invoke execute function", () => {
				expect(executeFn).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe("given execute is invoked", () => {
		describe("when canExecute is true", () => {
			beforeEach(() => {
				const isInitialValid = true;
				SUT = command(executeFn, new BehaviorSubject<boolean>(isInitialValid), { injector, isAsync: false });
			});

			it("should invoke execute function passed", () => {
				SUT.execute();
				expect(executeFn).toHaveBeenCalledTimes(1);
			});
		});

		describe("when observable completes", () => {
			beforeEach(() => {
				const isInitialValid = true;
				asyncExecuteFn = vi.fn().mockImplementation(() => EMPTY);
				SUT = commandAsync(asyncExecuteFn, new BehaviorSubject<boolean>(isInitialValid), { injector });
			});

			it("should invoke multiple times", () => {
				SUT.execute();
				SUT.execute();
				expect(SUT.isExecuting).toBeFalsy();
				expect(asyncExecuteFn).toHaveBeenCalledTimes(2);
			});
		});

		describe("when an error is thrown", () => {
			const _errorFn = console.error;
			beforeAll(() => {
				console.error = vi.fn();
			});

			beforeEach(() => {
				const isInitialValid = true;
				executeFn = vi.fn().mockImplementation(() => {
					throw new Error("Execution failed!");
				});
				SUT = command(executeFn, new BehaviorSubject<boolean>(isInitialValid), { injector, isAsync: false });
			});

			it("should invoke multiple times", () => {
				SUT.execute();
				SUT.execute();
				expect(SUT.isExecuting).toBeFalsy();
				expect(executeFn).toHaveBeenCalledTimes(2);
			});

			afterAll(() => {
				console.error = _errorFn;
			});
		});

		describe("when args are passed", () => {
			beforeEach(() => {
				const isInitialValid = true;
				SUT = command(executeFn, new BehaviorSubject<boolean>(isInitialValid), { injector, isAsync: false });
			});

			it("and has 1 param should receive 1 arg", () => {
				const args = { name: "rexxar" };
				SUT.execute(args);
				expect(executeFn).toHaveBeenCalledTimes(1);
				expect(executeFn).toHaveBeenCalledWith(args);
			});

			it("and is array param should not spread", () => {
				const hero = { name: "rexxar" };
				const args = [hero, "yello"];
				SUT.execute(args);
				expect(executeFn).toHaveBeenCalledTimes(1);
				expect(executeFn).toHaveBeenCalledWith([hero, "yello"]);
			});

			it("and multi args are pass should receive all", () => {
				const hero = { name: "rexxar" };
				SUT.execute(hero, "yello");
				expect(executeFn).toHaveBeenCalledTimes(1);
				expect(executeFn).toHaveBeenCalledWith(hero, "yello");
			});
		});

		describe("when canExecute is false", () => {
			beforeEach(() => {
				const isInitialValid = false;
				SUT = command(executeFn, new BehaviorSubject<boolean>(isInitialValid), { injector, isAsync: false });
			});

			it("should not execute the provided execute function", () => {
				SUT.execute();
				expect(executeFn).not.toHaveBeenCalled();
			});
		});
	});

	describe("given canExecute with an initial value of true", () => {
		let canExecute$: BehaviorSubject<boolean>;

		beforeEach(() => {
			const isInitialValid = true;
			canExecute$ = new BehaviorSubject<boolean>(isInitialValid);
			SUT = command(executeFn, canExecute$, { injector, isAsync: false });
		});

		it("should have canExecute set to true", () => {
			expect(SUT.canExecute).toBe(true);
		});

		it("should have $canExecute signal set to true", () => {
			expect(SUT.$canExecute()).toBe(true);
		});

		describe("when the canExecute observable changes", () => {
			beforeEach(() => {
				canExecute$.next(false);
			});

			it("should update canExecute", () => {
				expect(SUT.canExecute).toBe(false);
			});

			it("should update $canExecute signal", () => {
				expect(SUT.$canExecute()).toBe(false);
			});
		});
	});

	describe("given canExecute with an initial value of false", () => {
		beforeEach(() => {
			const isInitialValid = false;
			SUT = command(executeFn, new BehaviorSubject<boolean>(isInitialValid), { injector, isAsync: false });
		});

		it("should have canExecute set to false", () => {
			expect(SUT.canExecute).toBe(false);
		});

		it("should have $canExecute signal set to false", () => {
			expect(SUT.$canExecute()).toBe(false);
		});
	});

	describe("given destroy is invoked", () => {
		beforeEach(() => {
			const isInitialValid = false;
			SUT = command(executeFn, new BehaviorSubject<boolean>(isInitialValid), { injector, isAsync: false });
		});

		it("should destroy successfully", () => {
			SUT.destroy();
		});
	});
});
