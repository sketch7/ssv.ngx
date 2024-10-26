import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ssv-ngx-command',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ngx.command.component.html',
  styleUrl: './ngx.command.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgxCommandComponent {}
