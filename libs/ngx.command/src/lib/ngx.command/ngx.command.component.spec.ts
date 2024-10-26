import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxCommandComponent } from './ngx.command.component';

describe('NgxCommandComponent', () => {
  let component: NgxCommandComponent;
  let fixture: ComponentFixture<NgxCommandComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxCommandComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NgxCommandComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
