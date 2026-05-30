# Contributing to hawk

Thank you for your interest in contributing to hawk!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/hawk.git`
3. Create a feature branch: `git checkout -b feature/your-feature`
4. Install dependencies: `npm install`
5. Create a `.env` file if needed (see `.env.example`)

## Development Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run linting
npm run lint

# Build the project
npm run build

# Start development server (if applicable)
npm run dev
```

## Code Standards

- Follow the existing code style (enforced by Prettier and ESLint)
- Write tests for new features
- Update documentation as needed
- Use conventional commit messages: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `chore:`

## Branch Naming

Use the following patterns:
- `feature/your-feature` - New features
- `fix/your-fix` - Bug fixes
- `hotfix/critical-fix` - Critical production fixes
- `docs/update-docs` - Documentation updates
- `chore/maintenance` - Maintenance tasks

## Pull Request Process

1. Ensure all tests pass: `npm test`
2. Ensure code is properly formatted: `npm run lint`
3. Create a descriptive PR title following conventional commits
4. Provide a clear description of changes
5. Link any related issues
6. Wait for code review and CI checks to pass
7. Once approved, your PR will be merged

## Commit Messages

Follow conventional commits format:
```
feat: add device detection for new browsers
fix: resolve memory leak in tracking module
docs: update API documentation
test: add unit tests for parser
chore: update dependencies
```

## Testing

All pull requests must include:
- Unit tests for new functionality
- Integration tests where applicable
- Updated test snapshots if needed

Run tests with:
```bash
npm test
```

## Performance Considerations

- Device detection should be fast and efficient
- Minimize bundle size impact
- Cache results where appropriate
- Profile code with performance monitoring tools

## Questions?

Feel free to open an issue or reach out to maintainers.

Happy coding! 🚀
