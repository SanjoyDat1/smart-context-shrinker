# Contributing to smart-context-shrinker

Thanks for helping grow this project! This guide keeps contributions consistent and reviewable.

## Getting started

1. Fork the repo and clone your fork.
2. `npm install`
3. Create a branch: `git checkout -b feat/your-feature`
4. Make changes with tests for new business logic.
5. Run the full check suite:

```bash
npm run typecheck
npm test
npm run build
```

6. Open a PR against `main`.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation only
- `test:` test additions/changes
- `refactor:` code change that neither fixes a bug nor adds a feature
- `chore:` tooling, deps, CI

## Code standards

- TypeScript **strict** mode — no `any`
- Named exports preferred
- Single-responsibility modules
- No `console.log` in library code
- No hardcoded secrets
- Zod validation for any external/LLM JSON

## Testing

- Use Vitest (see `tests/shrinker.test.ts`)
- Mock OpenAI via the optional `client` param on `shrinkContext` / `extractLedger`
- Test business logic, not wiring

## Pull request checklist

- [ ] Tests pass locally
- [ ] Typecheck passes
- [ ] Public API changes documented in `README.md` and `docs/API.md`
- [ ] No breaking changes without a major version bump discussion

## Reporting bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml). Include:

- Node version
- Package version
- Minimal reproduction steps
- Expected vs actual behavior

## Feature requests

Open an issue with the [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml). Describe the use case, not just the API shape.

## Code of conduct

Be respectful and constructive. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
