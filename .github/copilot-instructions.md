# GitHub Copilot Instructions

This codebase is an Nx workspace for Angular utility libraries focused on UX patterns and command management.

## Architecture Overview

This is a monorepo containing two main Angular libraries:

- `@ssv/ngx.command` - Command pattern implementation for Angular
- `@ssv/ngx.ux` - UX utilities, primarily viewport management

### Library Structure

- Libraries in `libs/` use Angular's `ng-package` build system
- Test app in `apps/test-app/` for development and testing
- Each library has its own `project.json`, package configuration, and TypeScript configs

## Key Development Patterns

### Command Pattern Implementation

The command library implements the command pattern with these key concepts:

- `command()` and `commandAsync()` factory functions for creating commands
- Commands automatically handle `canExecute`, `isExecuting` states
- Directive `[ssvCommand]` binds commands to UI elements (typically buttons)
- Support for signal-based, observable-based, and function-based `canExecute` logic

Example usage:

```typescript
// In component
saveCmd = command(() => this.save(), this.isValid);
saveAsyncCmd = commandAsync(() => this.saveAsync$(), this.canSave$);

// In template
<button [ssvCommand]="saveCmd">Save</button>
<button [ssvCommand]="saveAsyncCmd" [ssvCommandParams]="[item.id]">Save Item</button>
```

### Viewport Management

The UX library provides responsive utilities:

- `ViewportService` with signals for current viewport size and type
- `*ssvViewportMatcher` structural directive for conditional rendering
- Configurable breakpoint system with size types (xsmall, small, medium, large, etc.)

Example viewport patterns:

```html
<div *ssvViewportMatcher="['>=', 'xlarge']">Desktop content</div>
<div *ssvViewportMatcher="['xsmall', 'small']">Mobile content</div>
```

## Development Workflows

### Key Commands

- `pnpm start` - Start test app for development
- `nx run-many -t build` - Build all libraries
- `nx run-many -t test` - Run all tests
- `nx run-many -t lint` - Lint all projects

### Testing Patterns

- Jest for unit testing with Nx integration
- Test files follow `.spec.ts` naming convention
- Mock functions use Jest syntax: `jest.fn()`, `jest.spyOn()`
- Tests focus on command state management and directive behavior

### Build System

- Uses Nx with Angular package builder (`@nx/angular:package`)
- Libraries built to `dist/libs/{lib-name}`
- Production builds use `tsconfig.lib.prod.json`
- Releases managed through `nx release` commands

## Angular-Specific Conventions

### Dependency Injection

- Prefer `inject()` function over constructor injection in modern code
- Services use `providedIn: 'root'` for singleton behavior
- Command factories auto-inject `DestroyRef` for cleanup

### Signals and RxJS Integration

- Heavy use of Angular signals for reactive state
- `toObservable()` and `toSignal()` for signal/observable interop
- Commands support both signal and observable-based `canExecute` logic

### TypeScript Patterns

- Strict TypeScript configuration
- Extensive use of type guards (e.g., `isCommand()`, `isCommandCreator()`)
- Generic types for command parameters and execution functions

## Library-Specific Guidelines

When working on `@ssv/ngx.command`:

- Maintain backward compatibility for command creation patterns
- Test both sync and async command execution paths
- Ensure directive properly handles enable/disable and CSS class management

When working on `@ssv/ngx.ux`:

- Consider server-side rendering compatibility for viewport detection
- Test responsive behavior across different breakpoint configurations
- Maintain performance for frequent viewport size changes
