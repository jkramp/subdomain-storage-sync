# Contributing to Cross-Domain Storage Sync

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## Pull Requests

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Code Style

* Use ES6+ features where appropriate
* Follow existing code style and patterns
* Add JSDoc comments for all public functions
* Use meaningful variable and function names
* Keep functions small and focused

### Linting

We use ESLint to maintain code quality. Run linting before submitting:

```bash
npm run lint
```

## Any contributions you make will be under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same [MIT License](http://choosealicense.com/licenses/mit/) that covers the project. Feel free to contact the maintainers if that's a concern.

## Report bugs using GitHub's [issues](https://github.com/yourusername/cross-domain-storage-sync/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/yourusername/cross-domain-storage-sync/issues/new); it's that easy!

## Write bug reports with detail, background, and sample code

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Feature Requests

We track feature requests as GitHub issues. When creating a feature request:

- Use a clear and descriptive title
- Provide a detailed description of the proposed feature
- Explain why this feature would be useful
- Consider the scope and complexity of the feature

## Development Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/cross-domain-storage-sync.git
cd cross-domain-storage-sync
```

2. Install dependencies
```bash
npm install
```

3. Make your changes to `storage.js`

4. Test your changes by opening `test.html` in your browser

5. Run linting
```bash
npm run lint
```

6. Build minified version
```bash
npm run build
```

## Testing

Currently, testing is manual through `test.html`. We welcome contributions to add automated testing!

### Local Testing with Subdomains

To test locally with subdomains, edit your `/etc/hosts` file:

```
127.0.0.1  app.test
127.0.0.1  admin.test
127.0.0.1  www.test
```

Then access your app at `http://app.test:8000` and `http://admin.test:8000`.

## Documentation

- Update README.md if you change functionality
- Add JSDoc comments to new functions
- Update examples if APIs change
- Keep documentation clear and concise

## Versioning

We use [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

## Questions?

Feel free to open an issue with the `question` label, or reach out to the maintainers directly.

## License

By contributing, you agree that your contributions will be licensed under its MIT License.

## References

This document was adapted from the open-source contribution guidelines template by [Brian A. Danielak](https://gist.github.com/briandk/3d2e8b3ec8daf5a27a62).