# Contributing to MANYA Intelligence OS

First: thank you. MANYA is a long-term, mission-driven project stewarded by the **Manya Hael Foundation** under the direction of **Uviwe Menyiwe (Azura Daemon)**. Contributions are welcome, but they must respect the project's architectural principles and governance model.

## Code of Conduct

Be excellent to each other. Harassment, discrimination, and bad faith are not tolerated. The Foundation reserves the right to remove any contributor who violates these principles.

## Architectural Principles

Every contribution must respect:

1. **Modularity** — packages compose; nothing hardcodes a single consumer.
2. **Security by default** — secure primitives, defensive validation, least privilege.
3. **Local-first** — packages must work fully offline. Cloud is optional and abstracted behind interfaces.
4. **Stable public APIs** — public exports are semver-bound. Internal modules are private.
5. **Backward compatibility** — deprecate before removing. Major versions only for breaking changes.
6. **Testability** — every public function has unit tests; critical paths have integration tests.
7. **Documentation** — every public export has TSDoc; every package has a README, CHANGELOG, and API reference.

## How to Contribute

### 1. Open an issue first

For anything beyond a typo or trivial fix, open an issue describing the problem and proposed solution. The Foundation will respond with a decision (accept / decline / revise). Unsolicited large PRs may be rejected.

### 2. Branch & develop

```bash
git checkout -b feature/<short-description>
```

- One logical change per PR.
- Keep PRs small and reviewable.
- Rebase onto `main` before submitting.

### 3. Code style

- TypeScript strict mode everywhere.
- No `any` in public APIs. Use `unknown` + narrowing if needed.
- Prefer pure functions. Side effects belong in clearly labelled services.
- Use named exports. Default exports are forbidden.
- Errors: throw typed `Error` subclasses, never strings.
- Async: prefer `async`/`await`. Avoid mixing with raw `.then()` chains.

### 4. Tests

- Every PR must include or update tests.
- Aim for ≥80% coverage on touched files.
- Run: `npm test` (root) or `npm test` (package).

### 5. Documentation

- Update the package `CHANGELOG.md` under `## [Unreleased]`.
- Update `docs/API.md` if public exports change.
- Add usage examples to `README.md` for new features.

### 6. Commit messages

Follow Conventional Commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`, `security`.

Scopes: package name (e.g. `keyring`, `cortex`).

### 7. Submit

Open a PR against `main`. Fill in the PR template. Sign off on the DCO line:

```
Signed-off-by: Your Name <you@example.com>
```

## Release Model

- Packages are versioned independently using semantic versioning.
- Releases are tagged `@manya-os/<pkg>@<version>`.
- The Foundation cuts releases; contributors do not publish.
- Breaking changes require a major version bump and a migration guide.

## Security Reports

See [SECURITY.md](SECURITY.md). **Do not file security issues as public GitHub issues.**

## Governance

Architectural direction and release authority rest with **Uviwe Menyiwe (Azura Daemon)** as founder and director of the Manya Hael Foundation. Maintainers may be appointed by the Foundation to manage specific packages.

## License

By contributing, you agree your contributions are licensed under the Apache-2.0 license and assigned to the Manya Hael Foundation for inclusion in the project.
