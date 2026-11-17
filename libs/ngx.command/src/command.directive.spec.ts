import { Component, Directive, inject, signal } from "@angular/core";
import { ComponentFixture, fakeAsync, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { BehaviorSubject, Observable, of, delay } from "rxjs";
import { vi } from "vitest";

import { SsvCommand } from "./command.directive";
import { command } from "./command";

// Test host component for button element
@Component({
	imports: [SsvCommand],
	template: `
		<button
			[ssvCommand]="saveCmd"
			data-testid="save-btn">
			Save
		</button>
	`,
})
class ButtonHostComponent {
	readonly isValid$ = new BehaviorSubject(true);
	readonly saveCmd = command(() => of(null).pipe(delay(100)), this.isValid$);
}

// Test host component for div element
@Component({
	imports: [SsvCommand],
	template: `
		<div
			[ssvCommand]="actionCmd"
			data-testid="action-div">
			Action
		</div>
	`,
})
class DivHostComponent {
	readonly $isValid = signal(true);
	readonly actionCmd = command(() => of(null).pipe(delay(100)), this.$isValid);
}

// Test host component with params
@Component({
	imports: [SsvCommand],
	template: `
		<button
			[ssvCommand]="removeCmd"
			[ssvCommandParams]="[item, 'extra']"
			data-testid="remove-btn">
			Remove
		</button>
	`,
})
class ParamsHostComponent {
	readonly item = { id: 1, name: "Test" };
	receivedArgs: [typeof this.item, string] | undefined;
	readonly removeCmd = command((item: typeof this.item, extra: string) => {
		this.receivedArgs = [item, extra];
		return of(null);
	});
}

// Test host component with command creator
@Component({
	imports: [SsvCommand],
	template: `
		<button
			[ssvCommand]="{host: this, execute: executeAction, canExecute: canExecute$, params: item}"
			data-testid="creator-btn">
			Execute
		</button>
	`,
})
class CommandCreatorHostComponent {
	readonly item = { id: 42 };
	readonly canExecute$ = new BehaviorSubject(true);
	executedWith: typeof this.item | null = null;

	executeAction = (item: typeof this.item): Observable<unknown> => {
		this.executedWith = item;
		return of(null).pipe(delay(50));
	};
}

// Test host component with command creator whose canExecute reads signals and returns reasons
@Component({
	imports: [SsvCommand],
	template: `
		<button
			[ssvCommand]="{host: this, execute: recruit, canExecute: canRecruit, params: hero}"
			data-testid="recruit-btn">
			Recruit
		</button>
		<button
			[ssvCommand]="{host: this, execute: recruit, canExecute: isOpen, params: hero}"
			data-testid="recruit-signal-btn">
			Recruit
		</button>
	`,
})
class CommandCreatorReasonsHostComponent {
	readonly hero = { name: "Rexxar" };
	readonly banned = signal(true);
	readonly isOpen = signal(false);

	recruit = (hero: typeof this.hero): string => hero.name;
	canRecruit = (hero: typeof this.hero) => this.banned() ? [{ code: "hero.banned", params: { name: hero.name } }] : true;
}

// Test host component whose bound command is swapped after init
@Component({
	imports: [SsvCommand],
	template: `<button [ssvCommand]="cmd()" data-testid="swap-btn">Recruit</button>`,
})
class SwapHostComponent {
	readonly recruitRexxar = vi.fn();
	readonly recruitJaina = vi.fn();
	readonly rexxarCmd = command(this.recruitRexxar);
	readonly jainaCmd = command(this.recruitJaina);
	readonly thrallCmd = command(vi.fn(), [{ code: "hero.banned" }]);
	readonly cmd = signal(this.rexxarCmd);
}

// Reads the command while the element's directives are created, before inputs are set
@Directive({ selector: "[earlyRead]" })
class EarlyReadDirective {
	readonly command = inject(SsvCommand).command();
}

@Component({
	imports: [SsvCommand, EarlyReadDirective],
	template: `<button [ssvCommand]="recruitCmd" earlyRead data-testid="early-btn">Recruit</button>`,
})
class EarlyReadHostComponent {
	readonly recruitCmd = command(vi.fn());
}

describe("SsvCommand Directive", () => {

	describe("on button element", () => {
		let fixture: ComponentFixture<ButtonHostComponent>;
		let component: ButtonHostComponent;
		let buttonEl: HTMLButtonElement;

		beforeEach(async () => {
			await TestBed.configureTestingModule({
				imports: [ButtonHostComponent],
			}).compileComponents();

			fixture = TestBed.createComponent(ButtonHostComponent);
			component = fixture.componentInstance;
			fixture.detectChanges();
			buttonEl = fixture.debugElement.query(By.css("[data-testid='save-btn']")).nativeElement;
		});

		describe("when initialized", () => {
			it("should not be disabled when canExecute is true", () => {
				expect(buttonEl.disabled).toBe(false);
			});

			it("should have ssv-command class", () => {
				expect(buttonEl.classList.contains("ssv-command")).toBe(true);
			});

			it("should not have executing class initially", () => {
				expect(buttonEl.classList.contains("executing")).toBe(false);
			});
		});

		describe("when canExecute becomes false", () => {
			beforeEach(() => {
				component.isValid$.next(false);
				fixture.detectChanges();
			});

			it("should disable the button", () => {
				expect(buttonEl.disabled).toBe(true);
			});
		});

		describe("when canExecute becomes true again", () => {
			beforeEach(() => {
				component.isValid$.next(false);
				fixture.detectChanges();
				component.isValid$.next(true);
				fixture.detectChanges();
			});

			it("should enable the button", () => {
				expect(buttonEl.disabled).toBe(false);
			});
		});

		describe("when executing", () => {
			beforeEach(fakeAsync(() => {
				buttonEl.click();
				fixture.detectChanges();
			}));

			it("should add executing class", () => {
				expect(buttonEl.classList.contains("executing")).toBe(true);
			});

			it("should have isExecuting set to true", () => {
				expect(component.saveCmd.isExecuting).toBe(true);
			});

			it("should disable the button during execution", () => {
				expect(buttonEl.disabled).toBe(true);
			});
		});

		describe("when execution completes", () => {
			it("should remove executing class", async () => {
				buttonEl.click();
				fixture.detectChanges();
				await vi.waitFor(() => {
					expect(component.saveCmd.isExecuting).toBe(false);
				}, { timeout: 200 });
				fixture.detectChanges();
				expect(buttonEl.classList.contains("executing")).toBe(false);
			});

			it("should have isExecuting set to false", async () => {
				buttonEl.click();
				fixture.detectChanges();
				await vi.waitFor(() => {
					expect(component.saveCmd.isExecuting).toBe(false);
				}, { timeout: 200 });
			});

			it("should enable the button after execution", async () => {
				buttonEl.click();
				fixture.detectChanges();
				await vi.waitFor(() => {
					expect(component.saveCmd.isExecuting).toBe(false);
				}, { timeout: 200 });
				fixture.detectChanges();
				expect(buttonEl.disabled).toBe(false);
			});
		});
	});

	describe("on div element", () => {
		let fixture: ComponentFixture<DivHostComponent>;
		let component: DivHostComponent;
		let divEl: HTMLDivElement;

		beforeEach(async () => {
			await TestBed.configureTestingModule({
				imports: [DivHostComponent],
			}).compileComponents();

			fixture = TestBed.createComponent(DivHostComponent);
			component = fixture.componentInstance;
			fixture.detectChanges();
			divEl = fixture.debugElement.query(By.css("[data-testid='action-div']")).nativeElement;
		});

		describe("when initialized", () => {
			it("should have ssv-command class", () => {
				expect(divEl.classList.contains("ssv-command")).toBe(true);
			});

			it("should not have executing class initially", () => {
				expect(divEl.classList.contains("executing")).toBe(false);
			});
		});

		describe("when canExecute becomes false via signal", () => {
			beforeEach(() => {
				component.$isValid.set(false);
				fixture.detectChanges();
			});

			it("should set disabled property on element", () => {
				expect((divEl as HTMLElement & { disabled?: boolean }).disabled).toBe(true);
			});
		});

		describe("when executing", () => {
			beforeEach(fakeAsync(() => {
				divEl.click();
				fixture.detectChanges();
			}));

			it("should add executing class", () => {
				expect(divEl.classList.contains("executing")).toBe(true);
			});

			it("should have isExecuting set to true", () => {
				expect(component.actionCmd.isExecuting).toBe(true);
			});
		});

		describe("when execution completes", () => {
			it("should remove executing class", async () => {
				divEl.click();
				fixture.detectChanges();
				await vi.waitFor(() => {
					expect(component.actionCmd.isExecuting).toBe(false);
				}, { timeout: 200 });
				fixture.detectChanges();
				expect(divEl.classList.contains("executing")).toBe(false);
			});

			it("should have isExecuting set to false", async () => {
				divEl.click();
				fixture.detectChanges();
				await vi.waitFor(() => {
					expect(component.actionCmd.isExecuting).toBe(false);
				}, { timeout: 200 });
			});
		});
	});

	describe("with ssvCommandParams", () => {
		let fixture: ComponentFixture<ParamsHostComponent>;
		let component: ParamsHostComponent;
		let buttonEl: HTMLButtonElement;

		beforeEach(async () => {
			await TestBed.configureTestingModule({
				imports: [ParamsHostComponent],
			}).compileComponents();

			fixture = TestBed.createComponent(ParamsHostComponent);
			component = fixture.componentInstance;
			fixture.detectChanges();
			buttonEl = fixture.debugElement.query(By.css("[data-testid='remove-btn']")).nativeElement;
		});

		describe("when clicked", () => {
			beforeEach(() => {
				buttonEl.click();
				fixture.detectChanges();
			});

			it("should pass params to execute function", () => {
				expect(component.receivedArgs).toEqual([component.item, "extra"]);
			});

			it("should pass the correct item object", () => {
				expect(component.receivedArgs?.[0]).toEqual({ id: 1, name: "Test" });
			});

			it("should pass the correct second param", () => {
				expect(component.receivedArgs?.[1]).toBe("extra");
			});
		});
	});

	describe("with command creator", () => {
		let fixture: ComponentFixture<CommandCreatorHostComponent>;
		let component: CommandCreatorHostComponent;
		let buttonEl: HTMLButtonElement;
		let directiveInstance: SsvCommand;

		beforeEach(async () => {
			await TestBed.configureTestingModule({
				imports: [CommandCreatorHostComponent],
			}).compileComponents();

			fixture = TestBed.createComponent(CommandCreatorHostComponent);
			component = fixture.componentInstance;
			fixture.detectChanges();

			const buttonDebugEl = fixture.debugElement.query(By.css("[data-testid='creator-btn']"));
			buttonEl = buttonDebugEl.nativeElement;
			directiveInstance = buttonDebugEl.injector.get<SsvCommand>(SsvCommand);
		});

		describe("when initialized", () => {
			it("should create command from creator", () => {
				expect(directiveInstance.command()).toBeDefined();
			});

			it("should not be disabled when canExecute is true", () => {
				expect(buttonEl.disabled).toBe(false);
			});
		});

		describe("when canExecute$ emits false", () => {
			beforeEach(() => {
				component.canExecute$.next(false);
				fixture.detectChanges();
			});

			it("should disable the button", () => {
				expect(buttonEl.disabled).toBe(true);
			});
		});

		describe("when clicked", () => {
			beforeEach(async () => {
				buttonEl.click();
				fixture.detectChanges();
				await vi.waitFor(() => {
					expect(directiveInstance.command().isExecuting).toBe(false);
				}, { timeout: 150 });
				fixture.detectChanges();
			});

			it("should execute with params from creator", () => {
				expect(component.executedWith).toEqual({ id: 42 });
			});
		});

		describe("when executing", () => {
			beforeEach(fakeAsync(() => {
				buttonEl.click();
				fixture.detectChanges();
			}));

			it("should add executing class", () => {
				expect(buttonEl.classList.contains("executing")).toBe(true);
			});

			it("should disable during execution", () => {
				expect(buttonEl.disabled).toBe(true);
			});
		});

		describe("when execution completes", () => {
			it("should remove executing class", async () => {
				buttonEl.click();
				fixture.detectChanges();
				await vi.waitFor(() => {
					expect(directiveInstance.command().isExecuting).toBe(false);
				}, { timeout: 150 });
				fixture.detectChanges();
				expect(buttonEl.classList.contains("executing")).toBe(false);
			});

			it("should enable after execution", async () => {
				buttonEl.click();
				fixture.detectChanges();
				await vi.waitFor(() => {
					expect(directiveInstance.command().isExecuting).toBe(false);
				}, { timeout: 150 });
				fixture.detectChanges();
				expect(buttonEl.disabled).toBe(false);
			});
		});
	});

	describe("with command creator returning reasons", () => {
		let fixture: ComponentFixture<CommandCreatorReasonsHostComponent>;
		let component: CommandCreatorReasonsHostComponent;
		const query = (testId: string) => {
			const el = fixture.debugElement.query(By.css(`[data-testid='${testId}']`));
			return { button: el.nativeElement as HTMLButtonElement, directive: el.injector.get<SsvCommand>(SsvCommand) };
		};

		beforeEach(async () => {
			await TestBed.configureTestingModule({
				imports: [CommandCreatorReasonsHostComponent],
			}).compileComponents();

			fixture = TestBed.createComponent(CommandCreatorReasonsHostComponent);
			component = fixture.componentInstance;
			fixture.detectChanges();
		});

		it("should be disabled with the reasons from a canExecute(...params) function", () => {
			const { button, directive } = query("recruit-btn");
			expect(button.disabled).toBe(true);
			expect(directive.command().$disabledReasons()).toEqual([{ code: "hero.banned", params: { name: "Rexxar" } }]);
		});

		it("should re-evaluate a canExecute(...params) function when its signals change", () => {
			const { button, directive } = query("recruit-btn");
			component.banned.set(false);
			fixture.detectChanges();
			expect(button.disabled).toBe(false);
			expect(directive.command().$disabledReasons()).toEqual([]);
		});

		it("should follow a signal canExecute", () => {
			const { button } = query("recruit-signal-btn");
			expect(button.disabled).toBe(true);
			component.isOpen.set(true);
			fixture.detectChanges();
			expect(button.disabled).toBe(false);
		});
	});

	describe("when the bound command is swapped", () => {
		let fixture: ComponentFixture<SwapHostComponent>;
		let component: SwapHostComponent;
		let directive: SsvCommand;
		let buttonEl: HTMLButtonElement;

		beforeEach(async () => {
			await TestBed.configureTestingModule({
				imports: [SwapHostComponent],
			}).compileComponents();

			fixture = TestBed.createComponent(SwapHostComponent);
			component = fixture.componentInstance;
			fixture.detectChanges();
			const el = fixture.debugElement.query(By.css("[data-testid='swap-btn']"));
			buttonEl = el.nativeElement;
			directive = el.injector.get(SsvCommand);
			component.cmd.set(component.thrallCmd);
			fixture.detectChanges();
		});

		it("should expose the new command", () => {
			expect(directive.command()).toBe(component.thrallCmd);
		});

		it("should follow the new command's canExecute", () => {
			expect(buttonEl.disabled).toBe(true);
		});

		it("should execute the new command", () => {
			component.cmd.set(component.jainaCmd);
			fixture.detectChanges();
			buttonEl.click();
			expect(component.recruitJaina).toHaveBeenCalledTimes(1);
			expect(component.recruitRexxar).not.toHaveBeenCalled();
		});
	});

	describe("when the command is read before init", () => {
		it("should be undefined until ngOnInit", async () => {
			await TestBed.configureTestingModule({ imports: [EarlyReadHostComponent] }).compileComponents();
			const fixture = TestBed.createComponent(EarlyReadHostComponent);
			fixture.detectChanges();
			const el = fixture.debugElement.query(By.css("[data-testid='early-btn']"));

			expect(el.injector.get(EarlyReadDirective).command).toBeUndefined();
			expect(el.injector.get(SsvCommand).command()).toBe(fixture.componentInstance.recruitCmd);
		});
	});

});
