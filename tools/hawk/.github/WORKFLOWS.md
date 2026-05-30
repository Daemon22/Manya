# Workflow Configuration for hawk

This document outlines all automated workflows configured for the hawk repository.

## Workflows Overview

### CI/CD Pipelines
- **test.yml** - Runs automated tests on Node.js 18.x and 20.x
- **lint.yml** - Performs code quality checks (ESLint, Prettier, security audit)
- **build.yml** - Builds the project and uploads artifacts
- **release.yml** - Creates releases when pushing version tags (v*)
- **dependency-updates.yml** - Weekly automated dependency updates

### Code Quality & Security
- **sonarcloud.yml** - Analyzes code quality with SonarCloud
- **codeql.yml** - Detects security vulnerabilities with GitHub CodeQL
- **security.yml** - Runs Trivy vulnerability scanning

### Advanced Features
- **sbom.yml** - Generates Software Bill of Materials (CycloneDX format)
- **pr-checks.yml** - Validates PR titles and branch names
- **performance.yml** - Monitors build size and performance metrics
- **docker.yml** - Builds Docker images automatically

## Triggering Workflows

### Automatic Triggers
- Pushes to `master`, `main`, or `develop` branches
- Pull requests to `master`, `main`, or `develop` branches
- Scheduled tasks (weekly dependency updates, CodeQL scans)

### Manual Triggers
- Tag creation: `git tag v1.0.0 && git push --tags` (triggers release workflow)
- Workflow dispatch: Run workflows manually from GitHub Actions tab

## Required Configuration

### Secrets to Configure (if using advanced features)
```
SONCLOUD_TOKEN - Required for SonarCloud analysis
```

### Branch Protection Rules (Recommended)
```
- Require status checks to pass before merging
- Require code reviews
- Dismiss stale pull request approvals when new commits are pushed
- Include administrators in restrictions
```

## Common Commands

```bash
# Run tests locally
npm test

# Run linting
npm run lint

# Build project
npm run build

# Create a release
git tag v1.0.0
git push origin v1.0.0
```

## Troubleshooting

- **Tests failing**: Check `.github/workflows/test.yml` and ensure `npm test` is configured in `package.json`
- **Lint errors**: Run `npm run lint` locally to fix issues before pushing
- **SonarCloud not scanning**: Add `SONARCLOUD_TOKEN` to repository secrets
- **Docker build failing**: Ensure `Dockerfile` exists in repository root

## Support

For workflow issues, check the Actions tab in your repository for detailed logs.
