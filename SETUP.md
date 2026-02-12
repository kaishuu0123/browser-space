# Browser Space - Setup Guide

## Project Created Successfully! 🎉

This is the initial project skeleton for **Browser Space**, a multi-account browser session manager.

## What's Included

### Configuration Files
- ✅ devcontainer setup (Node.js 24 LTS)
- ✅ TypeScript configuration
- ✅ ESLint + Prettier
- ✅ Tailwind CSS
- ✅ electron-vite
- ✅ electron-builder

### Project Structure
```
browser-space/
├── .devcontainer/          # Dev container configuration
├── .vscode/                # VSCode settings
├── src/
│   ├── main/              # Electron main process
│   ├── preload/           # Electron preload scripts
│   └── renderer/          # React UI
├── resources/             # App resources (icons, etc.)
├── build/                 # Build configuration
└── [config files]
```

## Next Steps

### 1. Open in VSCode with devcontainer

```bash
# Open the project folder in VSCode
code browser-space

# VSCode will prompt you to "Reopen in Container"
# Click "Reopen in Container"
```

### 2. Install Dependencies

Once the container is running:
```bash
yarn install
```

### 3. Run Development Server

```bash
yarn dev
```

This will start the Electron app in development mode with hot reload.

### 4. What to Build Next

According to the requirements, you'll need to implement:

#### Phase 1: Core Architecture
- [ ] Multiple WebView management with session isolation
- [ ] Profile data structure and persistence
- [ ] Basic sidebar UI (collapsible)

#### Phase 2: Profile Management
- [ ] Settings screen with profile list
- [ ] Profile creation/editing/deletion
- [ ] Icon selection (Codicon integration)
- [ ] Color picker for profile icons
- [ ] Drag & drop reordering

#### Phase 3: WebView Integration
- [ ] Profile switching
- [ ] Session isolation per profile
- [ ] Favicon auto-fetch
- [ ] Notification permission management

#### Phase 4: Polish
- [ ] Data path display
- [ ] Memory optimization (suspend mode)
- [ ] Background notification settings
- [ ] Delete confirmation dialogs

## Important Notes

### Icon File
The `resources/icon.png.placeholder` needs to be replaced with an actual PNG icon (512x512 or 1024x1024 recommended).

### Notification Permissions
**CRITICAL**: Notification permissions must be handled properly:
- Show permission dialog (like Chrome)
- User must explicitly approve
- Default is DENY
- Store permission state per profile

### Memory Management
- Implement suspend mode for inactive profiles
- Target: 300-400MB total memory usage
- Option for background notifications per profile

## Build Commands

```bash
# Build for Windows
yarn build:win

# Build for macOS
yarn build:mac

# Build for Linux
yarn build:linux
```

## Troubleshooting

If you encounter issues:
1. Make sure you're using Node.js 24 LTS
2. Delete `node_modules` and `yarn.lock`, then run `yarn install` again
3. Check that all TypeScript types are properly installed

## Tech Stack Reference

- **Electron**: ^33.2.1
- **React**: ^18.3.1
- **TypeScript**: ^5.7.2
- **Tailwind CSS**: ^3.4.17
- **electron-vite**: ^2.3.0
- **Node.js**: 24 LTS

Good luck building Browser Space! 🚀
