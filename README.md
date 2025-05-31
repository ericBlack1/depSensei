# DepSensei 🛡️

A smart CLI tool that helps developers maintain healthy dependencies across their projects. DepSensei automatically detects, analyzes, and helps resolve dependency issues while keeping your project secure and up-to-date.

[![npm version](https://img.shields.io/npm/v/depsensei.svg)](https://www.npmjs.com/package/depsensei)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

## ✨ Features

- 🔍 **Smart Analysis**: Automatically detects outdated, deprecated, and conflicting dependencies
- 🎯 **Multi-Ecosystem Support**: Currently supports JavaScript/Node.js, with more ecosystems coming soon
- 🛠️ **Intelligent Fixes**: Provides smart suggestions for resolving dependency issues
- 🧪 **Safe Testing**: Tests fixes in a sandboxed environment before applying them
- 🔒 **Secure Updates**: Creates backups and allows selective package updates
- 📊 **Detailed Reports**: Clear, tabular reports of dependency issues and suggested fixes

## 📦 Installation

```bash
# Install globally
npm install -g depsensei

# Or use npx
npx depsensei
```

## 🚀 Quick Start

1. Navigate to your project directory:
```bash
cd your-project
```

2. Analyze your dependencies:
```bash
depsensei analyze
```

3. Review and apply fixes:
```bash
depsensei apply
```

## 📝 Usage Guide

### Analyzing Dependencies

```bash
# Basic analysis
depsensei analyze

# Analyze with specific options
depsensei analyze --include-dev --include-peer
```

The analysis will show:
- Outdated packages
- Deprecated packages
- Version conflicts
- Security vulnerabilities (coming soon)

### Applying Fixes

```bash
# Interactive mode (recommended)
depsensei apply

# Force mode (skip confirmations)
depsensei apply --force

# Skip backup creation
depsensei apply --no-backup

# Skip npm install after updates
depsensei apply --no-install
```

The apply command will:
1. Show all detected issues
2. Let you choose whether to proceed
3. Allow you to select which packages to update
4. Create a backup of your package.json
5. Apply the selected updates
6. Run npm install (unless --no-install is specified)

### Command Options

```bash
# Show help
depsensei --help

# Show version
depsensei --version
```

## 🛠️ Supported Ecosystems

### Currently Supported
- **JavaScript/Node.js**
  - package.json
  - package-lock.json
  - Detects outdated, deprecated, and conflicting dependencies
  - Smart version resolution
  - Safe update application

### Coming Soon
- Python (requirements.txt, pyproject.toml)
- Rust (Cargo.toml)
- Ruby (Gemfile)
- Java (pom.xml, build.gradle)

## 💻 Development

### Prerequisites

- Node.js 14 or higher
- npm 6 or higher

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/depsensei.git
cd depsensei
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

### Available Scripts

```bash
# Run tests
npm test

# Run workflow tests
npm run test:workflow

# Start development mode
npm run dev

# Lint code
npm run lint

# Format code
npm run format

# Build project
npm run build
```

### Project Structure

```
depsensei/
├── src/
│   ├── analyzers/     # Ecosystem-specific analyzers
│   ├── fixers/        # Fix generators and appliers
│   ├── commands/      # CLI commands
│   ├── core/          # Core types and utilities
│   └── utils/         # Helper functions
├── test/              # Test files
└── dist/             # Compiled output
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write clear, descriptive commit messages
- Add tests for new features
- Update documentation for any changes
- Follow the existing code style
- Make sure all tests pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [npm-check-updates](https://github.com/raineorshine/npm-check-updates) for inspiration
- All contributors who have helped shape this project

## 📞 Support

If you encounter any issues or have questions, please:
1. Check the [existing issues](https://github.com/yourusername/depsensei/issues)
2. Create a new issue if needed
3. Join our [Discord community](https://discord.gg/depsensei) (coming soon) 