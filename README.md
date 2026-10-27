# Browser Space

A multi-account browser session manager. Switch between isolated Gmail, Slack, and web accounts with named workspaces.

## Features

- 🔒 **Isolated Sessions** - Each profile has completely separated cookies, localStorage, and session data
- 🎨 **Customizable Profiles** - Name your profiles, choose from 400+ icons or upload custom images, pick colors
- 🌍 **Language Settings** - Set browser language per profile (15 languages supported)
- 📱 **Collapsible Sidebar** - Icon-only or icon+name view
- 🔔 **Notification Control** - Configurable per profile (Allow all / Ask / Block all)
- 🗑️ **Data Management** - Clear cookies, cache, and app data per profile
- 🔄 **Drag & Drop Reorder** - Organize profiles with drag and drop
- 💾 **Data Path Access** - View and access profile data directories
- 🚀 **Lightweight** - Built with Electron and optimized for performance

## Development

### Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [devcontainer](https://code.visualstudio.com/docs/devcontainers/tutorial)

### Project Setup

#### Install

```bash
pnpm install
```

#### Development

```bash
pnpm dev
```

#### Build

##### Windows Build (on Linux/DevContainer)

To build Windows executables from Linux/DevContainer, you need to install Wine:

```bash
# Add 32-bit architecture support
sudo dpkg --add-architecture i386

# Update package list
sudo apt-get update

# Install Wine
sudo apt-get install -y wine wine32 wine64

# Build for Windows
pnpm build:win
```

The Windows installer will be created in `dist/` directory:
- `browser-space-0.1.0-setup.exe` - NSIS installer

##### macOS Build

```bash
pnpm build:mac
```

Requirements: macOS system required for proper code signing

##### Linux Build

```bash
pnpm build:linux
```

Outputs:
- AppImage
- Snap package
- Debian package

#### Build Output

All build artifacts are created in the `dist/` directory:
```
dist/
├── browser-space-0.1.0-setup.exe       # Windows installer
├── browser-space-0.1.0.dmg             # macOS disk image
├── browser-space-0.1.0.AppImage        # Linux AppImage
├── browser-space-0.1.0.snap            # Linux Snap
└── browser-space_0.1.0_amd64.deb       # Debian package
```

## Technology Stack

- **Framework:** Electron
- **Build Tool:** electron-vite
- **UI:** React + TypeScript
- **Styling:** Tailwind CSS
- **Package Manager:** pnpm
- **Node.js:** 24 LTS

## License

MIT
