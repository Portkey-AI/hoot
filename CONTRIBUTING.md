# Contributing to Hoot

Thank you for your interest in contributing to Hoot! We welcome contributions from the community.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/yourusername/hoot.git
   cd hoot
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development environment:
   ```bash
   npm run dev:full
   ```

## Development Workflow

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Test your changes locally
4. Commit your changes:
   ```bash
   git commit -m "feat: add your feature description"
   ```
5. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
6. Open a Pull Request

## Coding Standards

- Use TypeScript for all new code
- Follow the existing code style
- Add comments for complex logic
- Keep components small and focused
- Use meaningful variable and function names

## Testing

Before submitting a PR:
- Test all features manually
- Ensure no TypeScript errors: `npm run build`
- Check that both backend and frontend work together

## Commit Message Format

We follow conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding tests
- `chore:` - Build process or auxiliary tool changes

## Areas We Need Help

- [ ] Resource testing UI
- [ ] Prompt testing UI
- [ ] Keyboard shortcuts
- [ ] Browser extension for CORS bypass
- [ ] Additional transports (stdio in Electron)
- [ ] UI/UX improvements
- [ ] Documentation improvements
- [ ] Bug fixes

## Questions?

Feel free to open an issue for:
- Bug reports
- Feature requests
- Questions about the codebase
- Discussion about improvements

Thank you for contributing! 🦉

