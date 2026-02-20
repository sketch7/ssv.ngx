# ssv-ngx-command Skill

Angular command pattern implementation skill for `@ssv/ngx.command` library.

## About

This skill provides best practices and patterns for implementing the command pattern in Angular applications using the `@ssv/ngx.command` library. It covers:

- Command creation with factory functions
- Directive usage for automatic control management
- Parameter handling (array wrapping)
- Collection patterns with isolated execution state
- Form integration
- Advanced patterns (CommandRef, per-item validation, CommandInput type)

## Installation

This skill is part of the `ssv.ngx` repository in `.agents/skills/ssv-ngx-command/`.

To use from external projects:

```bash
# Reference the skill from this repo
# Or copy to your .agents/skills directory
```

## Structure

```
ssv-ngx-command/
├── SKILL.md                           # Core patterns (<200 lines)
├── README.md                          # This file
└── references/
    └── advanced-patterns.md           # CommandRef, per-item validation
```

## When to Use

This skill triggers on:
- Button state management during async operations
- Action execution with loading indicators
- Form submission handling
- Disabling controls during execution
- Command pattern implementation
- Collection operations (loops with actions)

## Key Concepts

### Factory Functions
Always use `command()` factory - never `new Command()`. Requires injection context.

### Array Parameter Wrapping
**Critical**: Single array arguments must be double-wrapped: `[[items]]`

### Isolated Execution State
Use command creator syntax in loops for per-item `isExecuting` tracking.

### Signal-Based
Modern API with `$isExecuting`, `$canExecute` signals. Observable support maintained.

## Quick Examples

### Basic Command
```typescript
saveCmd = command(() => this.save$(), this.isValid);
```

### Directive
```html
<button [ssvCommand]="saveCmd">Save</button>
```

### Collection
```html
@for (item of items; track item.id) {
  <button [ssvCommand]="{host: this, execute: delete$, params: [item]}">
    Delete
  </button>
}
```

## Progressive Disclosure

The skill follows progressive disclosure:
1. **SKILL.md** - Essential patterns for 90% of use cases
2. **references/** - Advanced patterns loaded as needed

## Reference

- **Library**: [@ssv/ngx.command](../../../libs/ngx.command/)
- **Examples**: [test-app](../../../apps/test-app/src/app/command/)
- **Tests**: [command.spec.ts](../../../libs/ngx.command/src/command.spec.ts)

## Contributing

When updating this skill:
1. Keep SKILL.md under 200 lines
2. Move complex patterns to references/
3. Test examples with actual library code
4. Follow Angular 21+ conventions
5. Include anti-patterns section
