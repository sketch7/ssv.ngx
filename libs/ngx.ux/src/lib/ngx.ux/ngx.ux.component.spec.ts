import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NgxUxComponent } from "./ngx.ux.component";

describe("NgxUxComponent", () => {
	let component: NgxUxComponent;
	let fixture: ComponentFixture<NgxUxComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [NgxUxComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(NgxUxComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
