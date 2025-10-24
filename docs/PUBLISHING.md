# Publishing Hoot to npm

This guide will help you publish Hoot to npm so users can run it with `npx -y hoot`.

## Prerequisites

1. **npm account**: Create one at https://www.npmjs.com/signup
2. **npm CLI logged in**: Run `npm login` and enter your credentials
3. **Package built**: Run `npm run build` to create the production build

## Pre-publish Checklist

- [ ] Update version in `package.json` (follow semver)
- [ ] Update `CHANGELOG.md` with latest changes
- [ ] Ensure all tests pass locally
- [ ] Check that `npm run build` completes without errors
- [ ] Update repository URL in `package.json` to your actual GitHub repo
- [ ] Review `.npmignore` to ensure only necessary files are included

## Publishing Steps

### 1. Update Package Information

Edit `package.json` and update these fields:
```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/hoot.git"
  },
  "bugs": {
    "url": "https://github.com/YOUR_USERNAME/hoot/issues"
  },
  "homepage": "https://github.com/YOUR_USERNAME/hoot#readme"
}
```

### 2. Build for Production

```bash
npm run build
```

This will:
- Compile TypeScript
- Build the Vite frontend
- Create optimized production assets in `dist/`

### 3. Test the Package Locally

Before publishing, test the package locally:

```bash
# Create a tarball
npm pack

# Test installation from tarball
npm install -g ./hoot-0.2.0.tgz

# Test running it
hoot

# Clean up
npm uninstall -g hoot
rm hoot-0.2.0.tgz
```

### 4. Publish to npm

```bash
# First time publishing
npm publish

# If the package name is already taken, use a scope
npm publish --access public
```

### 5. Verify the Package

After publishing:

```bash
# Test with npx
npx -y hoot

# Or install globally and run
npm install -g hoot
hoot
```

## Post-publish Steps

1. **Create a GitHub Release**
   - Tag the version: `git tag v0.2.0`
   - Push the tag: `git push origin v0.2.0`
   - Create release on GitHub with changelog

2. **Update Documentation**
   - Add installation instructions to README
   - Update examples with the published package name

3. **Announce**
   - Share on social media
   - Post in relevant communities
   - Update any related documentation

## Updating the Package

When you need to publish a new version:

```bash
# Update version (choose one)
npm version patch  # 0.2.0 -> 0.2.1
npm version minor  # 0.2.0 -> 0.3.0
npm version major  # 0.2.0 -> 1.0.0

# This will automatically:
# - Update package.json
# - Create a git commit
# - Create a git tag

# Build and publish
npm run build
npm publish

# Push to git
git push origin main --tags
```

## Files Included in npm Package

The following files are included (see `.npmignore`):
- `bin/` - CLI scripts
- `dist/` - Built frontend assets
- `mcp-backend-server.js` - Backend server
- `package.json` - Package metadata
- `README.md` - Documentation
- `LICENSE` - License file

The following are excluded:
- `src/` - Source TypeScript files
- `docs/` - Documentation files
- `tests/` - Test files
- `examples/` - Example files
- Development configuration files

## Troubleshooting

### Package name already taken
Use an npm scope: Change package name to `@yourusername/hoot`

### Permission denied
Run `npm login` again to authenticate

### Build fails
Check that all dependencies are installed: `npm install`

### Binary not working
Ensure `bin/hoot.js` has execute permissions: `chmod +x bin/hoot.js`

## Best Practices

1. **Semantic Versioning**: Follow semver for version numbers
2. **Changelog**: Keep CHANGELOG.md up to date
3. **Testing**: Test locally before publishing
4. **Git Tags**: Tag releases in git
5. **Documentation**: Keep README.md accurate and helpful

## Support

- GitHub Issues: https://github.com/yourusername/hoot/issues
- npm Package: https://www.npmjs.com/package/hoot
- Documentation: See `docs/` folder

