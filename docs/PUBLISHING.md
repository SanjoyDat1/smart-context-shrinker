# Publishing guide

## GitHub releases

Releases are automated when you push a version tag:

```bash
# Bump version in package.json and CHANGELOG.md first
git add package.json CHANGELOG.md
git commit -m "chore: release v0.2.0"
git tag v0.2.0
git push origin main --tags
```

The [Release workflow](../.github/workflows/release.yml) runs tests, builds, and creates a GitHub Release from `CHANGELOG.md`.

## npm publishing

Publishing is automated when a GitHub Release is **published** (not draft).

### One-time setup

1. Create an npm account at https://www.npmjs.com/signup
2. Create an **Automation** (or **Publish**) token at https://www.npmjs.com/settings/~your-username/tokens
3. Add it as a GitHub repository secret:
   - Go to **Settings → Secrets and variables → Actions**
   - New secret: `NPM_TOKEN` = your npm token

4. Enable **trusted publishing** (recommended) or use the token above:
   - npm package settings → **Publishing access** → connect GitHub repo

### Manual publish (fallback)

```bash
npm login
npm run typecheck && npm test && npm run build
npm publish --access public
```

The `prepublishOnly` script runs checks automatically.

## Version checklist

- [ ] Update `CHANGELOG.md` with release date and changes
- [ ] Bump `version` in `package.json`
- [ ] Run `npm test && npm run build` locally
- [ ] Commit, tag `vX.Y.Z`, push tag
- [ ] Verify GitHub Release created
- [ ] Verify npm publish workflow succeeded (if `NPM_TOKEN` configured)
