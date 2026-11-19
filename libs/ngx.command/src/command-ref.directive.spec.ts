import { Component, signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { BehaviorSubject } from "rxjs";
import { vi } from "vitest";

import { SsvCommand } from "./command.directive";
import { SsvCommandRef } from "./command-ref.directive";
import type { CommandCreator } from "./command.model";

// The same creator through `ssvCommandRef` (shared command) and `ssvCommand` (own command).
@Component({
	imports: [SsvCommand, SsvCommandRef],
	template: `
		<div #ref="ssvCommandRef" [ssvCommandRef]="{ host: this, execute: recruit, canExecute: canExecute }">
			<button [ssvCommand]="ref.command()" data-testid="ref-btn">Recruit</button>
		</div>
		<button [ssvCommand]="{ host: this, execute: recruit, canExecute: canExecute }" data-testid="creator-btn">Recruit</button>
	`,
})
class CreatorHostComponent {
	readonly valid$ = new BehaviorSubject(false);
	readonly valid = signal(false);
	readonly recruit = vi.fn();
	canExecute: CommandCreator["canExecute"];
}

type Host = CreatorHostComponent;

describe("command creator canExecute", () => {
	describe.each<{ name: string; canExecute: (host: Host) => CommandCreator["canExecute"] }>([
		{ name: "an observable", canExecute: host => host.valid$ },
		{ name: "a function returning an observable", canExecute: host => () => host.valid$ },
		{ name: "a host-bound function returning an observable", canExecute: () => function (this: Host) { return this.valid$; } },
		{ name: "a signal", canExecute: host => host.valid },
		{ name: "a host-bound function reading a signal", canExecute: () => function (this: Host) { return this.valid(); } },
		{ name: "a function returning a signal", canExecute: host => () => host.valid },
	])("given $name", ({ canExecute }) => {
		let fixture: ComponentFixture<CreatorHostComponent>;
		const button = (testId: string) => fixture.debugElement.query(By.css(`[data-testid='${testId}']`)).nativeElement as HTMLButtonElement;

		beforeEach(async () => {
			await TestBed.configureTestingModule({ imports: [CreatorHostComponent] }).compileComponents();
			fixture = TestBed.createComponent(CreatorHostComponent);
			fixture.componentInstance.canExecute = canExecute(fixture.componentInstance);
			fixture.detectChanges();
		});

		it.each(["ref-btn", "creator-btn"])("%s should be disabled while it cannot execute", testId => {
			expect(button(testId).disabled).toBe(true);
		});

		it.each(["ref-btn", "creator-btn"])("%s should be enabled once it can execute", testId => {
			fixture.componentInstance.valid$.next(true);
			fixture.componentInstance.valid.set(true);
			fixture.detectChanges();
			expect(button(testId).disabled).toBe(false);
		});
	});
});
