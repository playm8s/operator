# Playm8s Operator - Agent Guidelines

This document provides essential information for agentic coding assistants working with the Playm8s Operator codebase.

## Build/Lint/Test Commands

### Primary Scripts (defined in package.json)

```bash
# Run linter (ESLint) on source code
npm run test

# Build the project (runs lint then TypeScript compiler)
npm run build

# Development mode (builds and runs the application)
npm run dev

# Update library dependencies
npm run update-libraries
```

### Running Individual Tests

Since the project uses ESLint for linting rather than traditional unit tests, to check a single file:

```bash
npx eslint src/path/to/specific/file.mts
```

To run the application with a single source file:

```bash
# First compile TypeScript
npx tsc src/path/to/specific/file.mts --outdir dist/

# Then run the compiled file
node dist/path/to/specific/file.mjs
```

## Code Style Guidelines

### Language and File Extensions

- TypeScript is used with `.mts` extension (ES modules)
- Compiled to JavaScript with `.mjs` extension
- Strict TypeScript mode is enabled

### Imports

- Use ES module import syntax (`import x from 'y'`)
- Group imports in logical blocks with blank lines between groups:
  1. External packages
  2. Critical/internal modules
  3. Logging modules
  4. Type definitions
  5. Business logic modules
  6. Utility functions
  7. API routes
  8. Metrics modules
- Use explicit file extensions in imports when referencing local files
- Sort imports alphabetically within each group

### Formatting

- Prettier is configured with:
  - Single quotes for strings
  - Semicolons required
  - Trailing commas where valid in ES5
  - 2-space indentation
- Line width is not strictly enforced but should be reasonable
- Use strict mode (`'use strict';`) at the top of each file

### Types

- TypeScript strict mode is enabled
- Prefer explicit type annotations for function parameters and return types
- Use interfaces for object shapes
- Use type aliases for unions and primitives

### Naming Conventions

- Use camelCase for variables and functions
- Use PascalCase for classes, interfaces, and types
- Use UPPER_SNAKE_CASE for constants
- Use descriptive names that convey purpose

### Error Handling

- Use async/await with try/catch blocks for asynchronous operations
- Log errors appropriately with contextual information
- Use Winston logger for consistent logging
- Handle errors close to where they occur

### Documentation

- Use JSDoc-style comments for functions with descriptions and parameter types
- Comment complex logic or non-obvious implementation decisions
- Keep comments up-to-date with code changes

### Kubernetes Integration

- Use the `@thehonker/k8s-operator` library for Kubernetes operator patterns
- Follow established patterns for Custom Resource Definition (CRD) handling
- Implement proper resource watching and reconciliation loops
- Handle Kubernetes API errors gracefully

### Testing

- Since the project uses ESLint for linting rather than traditional unit tests:
  - Ensure code passes ESLint checks (`npm run test`)
  - Manually test functionality in development environment
  - Verify Kubernetes resource handling works correctly
  - Check logging output is appropriate and informative
