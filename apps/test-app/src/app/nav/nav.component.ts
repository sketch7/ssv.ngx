import {
	Component,
	OnInit,
	OnDestroy,
	Renderer2,
	ElementRef,
	ViewChild,
	inject,
	ChangeDetectionStrategy,
} from "@angular/core";
import { DOCUMENT, NgClass } from "@angular/common";
import { RouterModule } from "@angular/router";

export function isHtmlLinkElement(
	element: Element,
): element is HTMLLinkElement {
	return element.tagName.toLowerCase() === "a";
}

interface LinkItem {
	title: string;
	path: string[];
	activeOptions?: { exact: boolean };
}

@Component({
	selector: "app-nav",
	templateUrl: "./nav.component.html",
	styleUrls: ["./nav.component.scss"],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: true,
	imports: [
		RouterModule,
		NgClass,
	]
})
export class NavComponent implements OnInit, OnDestroy {

	links: LinkItem[] = [
		// { path: ["/"], title: "Home", activeOptions: { exact: true } },
		{ path: ["/command"], title: "Command" },
	];

	// appTitle = this.appInfo.title;
	// appVersion = this.appInfo.version;
	// appEnv = this.appInfo.environment;
	// isDebug = this.appInfo.isDebug;

	isMenuOpened = false;
	@ViewChild("menu", { static: true }) menuElementRef: ElementRef | undefined;

	private domClickListener$$!: () => void;

	private readonly document = inject(DOCUMENT, { optional: true });
	private readonly renderer = inject(Renderer2);

	ngOnInit(): void {
		this.domClickListener$$ = this.renderer.listen(
			this.document,
			"click",
			this.onBodyClick.bind(this),
		);
	}

	ngOnDestroy(): void {
		this.domClickListener$$();
	}

	onBodyClick(event: Event): void {
		if (!this.menuElementRef || !this.isMenuOpened) {
			return;
		}

		if (
			event.target === this.menuElementRef.nativeElement ||
			this.menuElementRef.nativeElement.contains(event.target as Node)
		) {
			const target = event.target as Element;
			if (!isHtmlLinkElement(target)) {
				return;
			}
		}
		this.isMenuOpened = false;
	}

}
