import { Component, ChangeDetectionStrategy, ChangeDetectorRef, signal, inject, DestroyRef, } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

import { BehaviorSubject, timer, Observable, tap, filter, map, distinctUntilChanged } from "rxjs";
import { CommandAsync, commandAsync, SsvCommandModule } from "@ssv/ngx.command";
import { CommonModule } from "@angular/common";

interface Hero {
	key: string;
	name: string;

	isInvulnerable?: boolean;
}

interface HeroPausedState {
	[key: string]: { isPaused: boolean };
}

@Component({
	selector: "app-example-command",
	templateUrl: "./example-command.component.html",
	styleUrls: ["./example-command.component.scss"],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: true,
	imports: [
		CommonModule,
		MatCardModule,
		MatIconModule,
		MatButtonModule,
		MatProgressSpinnerModule,
		SsvCommandModule,
	]
})
export class ExampleCommandComponent {

	isValid = true;
	isExecuting = false;

	readonly isValid$ = new BehaviorSubject(false);
	readonly isValidRedux$ = new BehaviorSubject(true);
	readonly isValidHeroRemove$ = new BehaviorSubject(true);
	readonly $isValid = signal(false);
	readonly $containerVisibility = signal(true);

	readonly saveCmd = new CommandAsync(() => this.save$(), this.isValid$);
	readonly saveSignalCmd = new CommandAsync(() => this.save$(), this.$isValid);
	readonly saveCmdNoValidation = new CommandAsync(() => this.save$());
	readonly removeHeroCmd = new CommandAsync(this.removeHero$.bind(this), this.isValidHeroRemove$);
	readonly pauseHeroCmd = new CommandAsync(this.pauseHero$.bind(this), this.isValidHeroRemove$);
	readonly saveReduxCmd = new CommandAsync(
		this.saveRedux.bind(this),
		this.isValidRedux$,
	);
	readonly containerDestroySaveCmd = commandAsync(() => this.save$());

	heroes: Hero[] = [
		{ key: "rexxar", name: "Rexxar" },
		{ key: "malthael", name: "Malthael" },
		{ key: "diablo", name: "Diablo" },
	];

	get invulnerableHero(): Hero {
		return this.invulnerableHeroState$.value;
	}
	invulnerableHeroState$ = new BehaviorSubject({
		key: "brahum",
		name: "Brahum",
		isInvulnerable: true
	} as Hero);

	// saveCmdSync: ICommand = new Command(this.save$.bind(this), this.isValid$, true);
	// saveCmd: ICommand = new Command(this.save$.bind(this), null, true);
	private _state = new BehaviorSubject({ isLoading: false });
	private _pauseState = new BehaviorSubject<HeroPausedState>({});

	private readonly cdr = inject(ChangeDetectorRef);
	private readonly destroyRef = inject(DestroyRef);

	constructor() {
		this.destroyRef.onDestroy(() => {
			console.warn("destroyRef.onDestroy");
		});
		// this.containerDestroySaveCmd.autoDestroy = false;
	}

	save() {
		this.isExecuting = true;
		setTimeout(() => {
			this.isExecuting = false;
			this.cdr.markForCheck();
			console.warn("save", "execute complete");
		}, 2000);
	}

	toggleValidity(): void {
		this.isValid = !this.isValid;
	}

	toggleValidity$(): void {
		this.isValid$.next(!this.isValid$.value);
		this.$isValid.update(x => !x);
	}

	toggleValidityRedux(): void {
		this.isValidRedux$.next(!this.isValidRedux$.value);
	}

	toggleValidityRemoveHero(): void {
		this.isValidHeroRemove$.next(!this.isValidHeroRemove$.value);
	}

	toggleContainer(): void {
		this.$containerVisibility.update(x => !x);
	}

	removeHero$(hero: Hero, param2: unknown, param3: unknown) {
		console.log("removeHero", { hero, param2, param3, heroes: this.heroes });

		return timer(2000).pipe(
			tap(() => {
				this.heroes = this.heroes.filter(h => h.key !== hero.key);
			}),
			tap(() => console.warn("removeHero$", "execute complete", this.heroes)),
		);
	}

	pauseHero$(hero: Hero, param2?: unknown, param3?: unknown) {
		console.log("pauseHero$", { hero, param2, param3, heroes: this.heroes });

		this.updateHeroPause(hero.key, { isPaused: true });
		return timer(2000).pipe(
			tap(() => console.warn("pauseHero$", "execute complete", this.heroes)),
			tap(() => this.updateHeroPause(hero.key, { isPaused: false })),
		);
	}

	canPauseHero$(hero: Hero, param2: unknown, param3: unknown): Observable<boolean> {
		console.log("canPauseHero$ - factory init", { hero, param2, param3, heroes: this.heroes });
		return this._pauseState.pipe(
			tap(x => console.warn(">>>> canPauseHero$ - pauseState emit #1", x, hero)),
			map(x => x[hero.key]),
			map(x => !x || !x.isPaused),
			distinctUntilChanged(),
			tap(x => console.warn(">>>> canPauseHero$ change", x, hero)),
			tap(() => this.cdr.markForCheck()),
		);
	}

	canRemoveHero$(hero: Hero): Observable<boolean> {
		console.log("canRemoveHero$ - factory init", { hero });

		return this.invulnerableHeroState$.pipe(
			map(x => !!x.isInvulnerable),
			tap(x => console.warn(">>>> canRemoveHero$ change", x, hero)),
		);
	}

	toggleHeroVulnerability(): void {
		console.log("toggleHeroVulnerability");
		const h = this.invulnerableHero;
		const newHero: Hero = { ...h, isInvulnerable: !h.isInvulnerable };
		this.invulnerableHeroState$.next(newHero);
	}

	private updateHeroPause(key: string, changes: { isPaused: boolean }) {
		const newState = Object.assign({}, this._pauseState.value, { [key]: { ...changes } });
		console.warn(">>> _pauseState change", newState);
		this._pauseState.next(newState);
	}

	private save$() {
		return timer(2000).pipe(
			tap(() => console.warn("save$", "execute complete")),
		);
	}

	private saveRedux() {
		// fake dispatch/epic
		this.fakeDispatch();

		console.warn(">>> saveRedux init");
		// selector
		return this._state.pipe(
			filter(x => !x.isLoading),
			tap(x => console.warn(">>>> isloading", x))
		);
	}

	private fakeDispatch() {
		this._state.next({ isLoading: true });
		timer(2000)
			.pipe(
				tap(() => console.warn("saveRedux$", "execute complete")),
				tap(() => this._state.next({ isLoading: false })),
			).subscribe();
	}

}
