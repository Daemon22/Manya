# Security Policy

## Supported Versions

| Version | Supported          |
|---------|-------------------|
| 0.9.x   | :white_check_mark: Yes |
| < 0.9   | :x: No |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **Email**: Send an email to security@hael.foundation with details about the vulnerability.
2. **Include**: Steps to reproduce, affected versions, and potential impact.
3. **Response**: We will acknowledge within 48 hours and provide regular updates.

### What to Include

- A clear description of the vulnerability
- Steps to reproduce the issue
- Affected versions of Manya
- Proof of concept (if applicable)
- Potential impact assessment

### Disclosure Policy

- We will fix confirmed vulnerabilities within 7-14 days depending on severity
- Security updates will be released via npm and GitHub
- Public disclosure will occur after a fix is available
- Credit will be given to reporters in the release notes

## Security Best Practices

### For Users

- Keep dependencies updated: `npm audit fix`
- Use environment variables for sensitive configuration
- Enable RBAC/ABAC via the Shield tool for access control
- Encrypt sensitive data using Vault and Signal tools
- Regular security audits recommended for production deployments

### For Developers

- Follow secure coding practices
- Run security audits before committing: `npm audit`
- Use the Forge tool for secure key derivation
- Implement proper input validation
- Never commit secrets or credentials

## Known Security Considerations

### Dependency Vulnerabilities

Run `npm audit` to check for known vulnerabilities in dependencies. Some may require manual intervention or dependency updates.

### Cryptographic Implementations

- Forge uses industry-standard cryptographic functions
- Always use the latest version of cryptographic libraries
- Key derivation uses appropriate salt and iteration counts

### Access Control

- Use Shield tool for RBAC/ABAC implementation
- Regularly review and update access policies
- Implement principle of least privilege

## Security Audits

This project undergoes regular security audits. Results are published in the SECURITY section of the repository.

## License

This security policy is part of the Manya project and follows the same MIT license terms.

## Contact

For security-related questions not involving vulnerability reports, please open a GitHub discussion with the `security` tag.