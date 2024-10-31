import { Component, ChangeDetectionStrategy, ViewEncapsulation } from "@angular/core";
import { RouterModule } from "@angular/router";
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';


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
	encapsulation: ViewEncapsulation.None,
	standalone: true,
	imports: [
		RouterModule,
		MatToolbarModule,
		MatMenuModule,
		MatIconModule,
		MatButtonModule,
	]
})
export class NavComponent {

	links: LinkItem[] = [
		// { path: ["/"], title: "Home", activeOptions: { exact: true } },
		{ path: ["/command"], title: "Command" },
	];

	// appTitle = this.appInfo.title;
	// appVersion = this.appInfo.version;
	// appEnv = this.appInfo.environment;
	// isDebug = this.appInfo.isDebug;

}
