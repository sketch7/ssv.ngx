import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface LinkItem {
	title: string;
	path: string[];
	activeOptions?: { exact: boolean };
}


@Component({
	standalone: true,
	imports: [
		RouterModule,
		MatToolbarModule,
		MatSidenavModule,
		MatListModule,
		MatIconModule,
		MatButtonModule,
	],
	selector: 'app-root',
	host: { class: 'app' },
	templateUrl: './app.component.html',
	styleUrl: './app.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
	encapsulation: ViewEncapsulation.None,
})
export class AppComponent {
	title = 'test-app';

	links: LinkItem[] = [
		// { path: ["/"], title: "Home", activeOptions: { exact: true } },
		{ path: ["/command"], title: "Command" },
		{ path: ["/ux-viewport"], title: "UX Viewport" },
	];

}
