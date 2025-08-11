# Changelog - Xeno Public Release

## [1.0.0] - 2024-01-XX - Open Source Release

### 🎉 Major Changes
- **Rebranded** from "AI Wellness Companion" to "Xeno Public Release"
- **Open sourced** the entire codebase
- **Removed all sensitive credentials** and API keys
- **Created comprehensive installation system**

### 🔐 Security & Privacy
- ✅ Removed all hardcoded API keys and credentials
- ✅ Deleted Google Cloud service account files
- ✅ Created template-based configuration system
- ✅ Enhanced .gitignore to prevent credential commits
- ✅ Updated all User-Agent strings and internal references

### 📝 Rebranding Changes
- **Project Name**: AI Wellness Companion → Xeno Public Release
- **Assistant Name**: Athena → Xeno
- **Repository**: `/athena` → `/xeno-public-release`
- **Container Names**: Updated Docker and Docker Compose configurations
- **Binary Name**: `ai-wellness-companion` → `xeno-public-release`

### 📚 Documentation Overhaul
- ✅ **NEW**: `INSTALLATION_GUIDE.md` - Comprehensive setup guide
- ✅ **NEW**: `QUICK_START.md` - 5-minute setup guide
- ✅ **NEW**: `install.sh` - Universal installation script
- ✅ **NEW**: `LICENSE` - Apache 2.0 license file
- ✅ **NEW**: `CHANGELOG.md` - This file
- ✅ **UPDATED**: `README.md` - Streamlined for open source
- ✅ **REMOVED**: All old installation guides and scripts

### 🛠️ Configuration System
- ✅ **NEW**: `config.template.json` - Main configuration template
- ✅ **NEW**: `google-service-account.template.json` - Google Cloud template
- ✅ **UPDATED**: `config.json` - Sanitized with placeholders
- ✅ Environment variable support for all credentials

### 🚀 Installation & Deployment
- ✅ **NEW**: Universal installation script (`install.sh`)
- ✅ Cross-platform support (Linux, macOS, Windows WSL2)
- ✅ Automatic dependency detection and installation
- ✅ Interactive setup options (audio testing, systemd service)
- ✅ Docker deployment support maintained

### 🔧 Package & Build System
- ✅ Updated `package.json` with new name and keywords
- ✅ Regenerated `package-lock.json`
- ✅ Updated npm scripts and removed old deployment commands
- ✅ Enhanced postinstall message with setup guidance

### 🗑️ Cleanup
- ✅ Removed old installation scripts and guides:
  - `MANUAL_INSTALL.md`
  - `AUTOMATED_INSTALL.md`
  - `deployment/deploy.sh`
  - `pi-setup.sh`
  - `deploy.sh`
- ✅ Removed empty deployment directory
- ✅ Cleaned up package.json scripts

### 🎯 User Experience
- ✅ **One-line installation**: `git clone ... && ./install.sh`
- ✅ **Template-based setup**: Copy templates, add credentials
- ✅ **Multiple documentation levels**: Quick start → Full guide
- ✅ **Cross-platform compatibility**: Works on all major platforms

### 🔗 Repository Updates
- ✅ All GitHub URLs updated to new repository name
- ✅ All documentation cross-references updated
- ✅ Issue and discussion links updated
- ✅ Social badges and links updated

## Configuration Migration

### For Existing Users
If you're migrating from the old version:

1. **Backup your current config.json**
2. **Copy new templates**: `cp config.template.json config.json`
3. **Migrate your settings** from backup to new config format
4. **Update API keys** in the new format
5. **Run new installation**: `./install.sh`

### New Configuration Format
```json
{
  "ai": {
    "openai": {
      "apiKey": "YOUR_OPENAI_API_KEY_HERE"
    },
    "speechServices": {
      "projectId": "YOUR_GOOGLE_PROJECT_ID"
    }
  }
}
```

## Breaking Changes
- ⚠️ **Configuration format changed** - requires migration
- ⚠️ **Binary name changed** - update any scripts using the old name
- ⚠️ **Installation process changed** - use new `install.sh` script
- ⚠️ **Repository URLs changed** - update git remotes

## Migration Commands
```bash
# Update git remote
git remote set-url origin https://github.com/chaitanya-science/xeno-public-release.git

# Reinstall with new system
./install.sh

# Update any scripts using old binary name
# OLD: ai-wellness-companion
# NEW: xeno-public-release
```

---

**🎉 Welcome to the open source era of Xeno!**

*This release marks the transition from a private project to a fully open source therapeutic AI companion, making mental health support accessible to everyone.*
