# Contributing to Manya

Thank you for your interest in contributing to Manya! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/Manya.git
   cd Manya
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run tests**
   ```bash
   npm run test:all
   ```

4. **Run the CLI**
   ```bash
   npm run manya -- help
   ```

## Development Workflow

### Branch Strategy

- `main` - Stable production code
- Feature branches - `feature/your-feature-name`
- Bug fix branches - `fix/your-bug-fix`
- Documentation branches - `docs/your-docs`

### Making Changes

1. Create a new branch for your changes
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our coding standards

3. Run tests to ensure nothing breaks
   ```bash
   npm run test:all
   ```

4. Commit your changes with descriptive messages
   ```bash
   git commit -m "feat: add new feature"
   ```

5. Push to your fork
   ```bash
   git push origin feature/your-feature-name
   ```

6. Create a pull request

## Coding Standards

### JavaScript/TypeScript

- Use ES modules (ESM)
- Follow existing code style
- Write tests for new functionality
- Add TypeScript definitions (.d.ts) for packages
- Use async/await for asynchronous operations

### Testing

- Use Node.js built-in test runner (`node --test`)
- Write descriptive test names
- Test both happy paths and error cases
- Maintain test coverage above 80%

### Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Update relevant documentation files
- Include examples in API documentation

## Project Structure

```
manya/
├── packages/          # Shared libraries and SDKs
├── tools/            # Domain-specific tools
├── site/             # Website and dashboards
├── tests/            # Integration tests
└── skills/           # Devin skill definitions
```

## Adding New Tools

1. Create tool directory under `tools/`
2. Implement the tool with standard structure:
   - `src/` - Source code
   - `test/` - Tests
   - `package.json` - Package configuration
   - `types.d.ts` - TypeScript definitions
3. Add manifest to `@manya/toolkit`
4. Register in root `package.json` workspaces
5. Add test scripts to root `package.json`
6. Update README.md

## Adding New Packages

1. Create package directory under `packages/`
2. Implement package following existing patterns
3. Add to root `package.json` workspaces
4. Add test scripts
5. Update documentation

## Testing

### Running Tests

```bash
# Run all tests
npm run test:all

# Run specific tool tests
npm run hawk:test
npm run forge:test

# Run package tests
npm run packages:test

# Run performance tests
npm run test:7x7
```

### Test Structure

Tests should follow the pattern:
- Unit tests for individual functions
- Integration tests for component interactions
- End-to-end tests for complete workflows

## Pull Request Process

### Before Submitting

- Ensure all tests pass
- Update documentation
- Add tests for new functionality
- Run `npm audit` to check for security issues

### PR Description

Include:
- Purpose of the change
- Description of changes
- Testing performed
- Screenshots if applicable
- Related issues

### Review Process

- Maintainers will review your PR
- Address feedback promptly
- Keep PRs focused and atomic
- Squash commits if needed

## Release Process

Releases are managed by maintainers following semantic versioning:

- **Major**: Breaking changes
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes

## Getting Help

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Check existing documentation
- Review similar issues/PRs

## Recognition

Contributors are recognized in:
- AUTHORS file
- Release notes
- Contributor section in README

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Contact

For questions about contributing:
- Open a GitHub discussion
- Email: contributors@hael.foundation

Thank you for contributing to Manya!