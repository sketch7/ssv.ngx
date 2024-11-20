[npm]: https://www.npmjs.com

# @ssv/ngx.ux
[![npm version](https://badge.fury.io/js/%40ssv%2Fngx.ux.svg)](https://badge.fury.io/js/%40ssv%2Fngx.ux)

UX essentials for building apps, utilities which enables you writing richer apps easier.

## Installation

Get library via [npm]

```bash
npm install @ssv/ngx.ux
```

Choose the version corresponding to your Angular version:

 | Angular | library |
 | ------- | ------- |
 | 17+     | 3.x+    |
 | 10+     | 2.x+    |
 | 4 to 9  | 1.x+    |


## Features
- Viewport (see below)
  - [Viewport Data](./src/viewport/viewport-data/README.md)

# Usage

## Viewport
Provides utilities to handle responsiveness easier based on the viewport (view size)

### Comparison Operands
| Operand | Description           |
| ------- | --------------------- |
| =       | Equals                |
| <>      | Not equals            |
| <       | Less than             |
| <=      | Less than or equal    |
| >       | Greater than          |
| >=      | Greater Than or equal |

<br>

### Size Types
These are the defaults, but they are configurable.

| Size Type | Size Range |
| --------- | ---------- |
| xsmall    | <=450      |
| small     | 451-767    |
| medium    | 768-992    |
| large     | 993-1200   |
| xlarge    | 1201-1500  |
| xxlarge   | 1501-1920  |
| xxlarge1  | >=1921     |


### Viewport Matcher Attribute (directive)
Structural directive which loads components based on a viewport sizing condition e.g. show ONLY if viewport is greater than xlarge.


#### Examples

```html
<!-- simple -->
<div *ssvViewportMatcher="'large'">
  show only when large
</div>

<!-- expression based - tuple (shorthand) *recommended usage* -->
<div *ssvViewportMatcher="['>=', 'xlarge']"> (see all operands and sizes)
  show when >= xlarge
</div>

<!-- expression based - object -->
<div *ssvViewportMatcher="{size: 'xlarge', operation: '<='}"> (see all operands and sizes)
  show when >= xlarge
</div>

<!-- includes -->
<div *ssvViewportMatcher="['large', 'xlarge']">
  show only when large, xlarge
</div>

<!-- excludes -->
<div *ssvViewportMatcher="''; exclude ['xsmall', 'small']">
  hide only when xsmall, small
</div>

<!-- match/else -->
<div *ssvViewportMatcher="['>=', 'xlarge']; else otherwise">
  show when >= xlarge
</div>

<ng-template #otherwise>
  show when expression is falsy (< xlarge)
</ng-template>

<!-- non structure syntax -->
<ng-template ssvViewportMatcher [ssvViewportMatcherExclude]="'xsmall'">
    (exclude xsmall)
</ng-template>
```

### Viewport Matcher Var (directive)
Structural directive which provides the condition var whether it matches or not (params are similar to `ssvViewportMatcher`).

```html
<!-- simple -->
<div *ssvViewportMatcherVar="let isLarge when 'large'">
  isLarge={{isLarge}}
</div>

<!-- expression based - tuple (shorthand) *recommended usage* -->
<div *ssvViewportMatcherVar="let isMediumDown when ['<=', 'medium']">
  isMediumDown={{isMediumDown}}
</div>

<!-- includes/or -->
<div *ssvViewportMatcherVar="let isLargeOrSmall when ['small', 'large']">
  isLargeOrSmall={{isLargeOrSmall}}
</div>
```

### Viewport Service

```ts
// get size type
this.viewport.sizeType$.pipe(
    tap(x => console.log("Viewport - sizeType changed", x)), // { type: 4, name: "xlarge", widthThreshold: 1500 }
  ).subscribe();
```

### Viewport for SSR
Since in SSR there is no way to know the client viewport size, we should at least determine device type and handle provide
3 different sizes based on device type e.g. `mobile`, `tablet` or `desktop` so the initial rendering will be closer based on device type.

The basic implementation allows to provide a device type `mobile`, `tablet` or `desktop` and there are static sizes for those.

```ts
import { withViewportSsrDevice } from "@ssv/ngx.ux";

const deviceType = deviceTypeFromServer;
export const appConfig: ApplicationConfig = {
  providers: [
    withViewportSsrDevice(deviceType)
  ]
}
```

The default implementation can also be replaced by implementing a small class as following:

```ts

export class SuperViewportServerSizeService {
  get(): ViewportSize {
    // do your magic..
    return size;
  }
}

import { ViewportServerSizeService } from "@ssv/ngx.ux";

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: ViewportServerSizeService, useClass: SuperViewportServerSizeService }
  ]
}
```


## Configure
You can configure the existing resize polling speed and as well as provide your custom breakpoints.

### Custom Breakpoints
```ts
import { provideSsvUxViewportOptions, generateViewportSizeType } from "@ssv/ngx.ux";

const breakpoints = { // custom breakpoints - key/width
  smallest: 500,
  small: 700,
  medium: 1000,
  large: 1400,
  extralarge: 1600,
  xxlarge: 1800,
  fhd: 1920,
  uhd: 3840
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideSsvUxViewportOptions({
      resizePollingSpeed: 66, // optional - defaults to 33
      breakpoints // provide the custom breakpoints
    }),

    // override existing breakpoints
    provideSsvUxViewportOptions(defaults => {
      return {
        breakpoints: {
          ...defaults.breakpoints,
          small: 1000,
        }
      };
    }),
  ]
}



```
