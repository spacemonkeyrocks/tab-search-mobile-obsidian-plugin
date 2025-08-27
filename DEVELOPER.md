# Developer Guide

This guide provides instructions for setting up the development environment to contribute to the Tab Search (Mobile) Obsidian plugin.

## Plugin Architecture

The plugin source code is organized in the `src/` directory with multiple modules for maintainability:

```
src/
├── main.js                  # Entry point and core plugin class
├── tab-search-manager.js    # Core search functionality coordination
├── mobile-tab-detector.js   # Mobile tab view state detection (HIGH RISK)
├── search-interface.js      # UI components and search interface (HIGH RISK)
├── tab-manager.js          # Workspace integration and tab navigation
├── mobile-utils.js         # Mobile-specific functionality (theme colors, positioning)
├── dom-observer.js         # Reusable DOM mutation detection library
├── settings.js             # Settings UI and management
└── logger.js               # Logging utilities
```

A build process bundles these source files into a single `main.js` in the project root for distribution.

## Important Notes

**Mobile-Only Plugin:** This plugin is designed exclusively for mobile devices. It will not function on desktop and will display an error message if loaded on desktop platforms.

**High-Risk Components:** The mobile tab detection and UI integration components (`mobile-tab-detector.js` and `search-interface.js`) rely on undocumented Obsidian mobile UI behavior and may be fragile to Obsidian updates.

## Local Development Setup

This method is recommended for active, iterative development.

**Prerequisites**
- [Node.js](https://nodejs.org/en) (version 18 or higher)
- npm (comes with Node.js)
- A test Obsidian vault, separate from your main vault
- **An Android or iOS device for testing** (the plugin cannot be tested on desktop)

### Step 1: Clone and Install Dependencies
```bash
git clone [https://github.com/YOUR_USERNAME/tab-search-obsidian-plugin.git](https://github.com/YOUR_USERNAME/tab-search-obsidian-plugin.git)
cd tab-search-obsidian-plugin
npm install
```

### Step 2: Configure Your Test Vault
Create a `.env` file in the project root. This file tells the scripts where your test vault is located and allows you to configure hot reloading.

```
# .env file
OBSIDIAN_VAULT=/path/to/your/test/vault
HOT_RELOAD=true
```

### Step 3: Install the Plugin
The `install.sh` script connects your project to your test vault. Use the `--link` mode for the best development experience. You only need to run this **once per vault**.

```bash
./install.sh --link
```

### Step 4: Set Up Hot Reloading (Recommended)
This plugin is mobile-only, and the hot-reload script does not work for mobile devices. For mobile testing, you will need to sync your vault (e.g., with Obsidian Sync or Syncthing) and restart the Obsidian app on your device after the watcher rebuilds your code.

### Step 5: Start Developing
Run the `watch` script. This will monitor your source files and rebuild `main.js` on changes.

```bash
npm run watch
```

## Available Scripts

| Script          | Purpose                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `build`         | Creates a single, production-ready `main.js` file after running format and lint checks.                                              |
| `watch`         | **Use this for development.** Automatically rebuilds `main.js` on file changes.                                                      |
| `install:vault` | A helper script that runs the installer in copy mode (`--install`).                                                                  |
| `dev`           | A one-time command that builds, bumps the patch version, and installs the plugin by copying.                                           |
| `lint`          | Checks your code for potential errors and style issues.                                                                              |
| `format`        | Automatically reformats all your code to ensure a consistent style.                                                                  |
| `release:dry`   | Simulates a full release to test your configuration without publishing anything.                                                     |
| `release:test`  | Tests the release process in a clean Docker container, mimicking the CI/CD environment.                                              |

## Docker-based Setup

This project uses Docker to provide a clean, isolated environment for running one-off tasks like simulating a release. It is not the recommended workflow for day-to-day coding.

For detailed instructions on how to build the Docker image and run a release dry-run, please see the **[RELEASING.md](RELEASING.md)** guide.

## Working with the Multi-File Architecture

When developing with the new `src/` directory structure:

**File Dependencies:**
- `src/main.js` imports from `tab-search-manager.js`, `settings.js`, `logger.js`
- `src/tab-search-manager.js` imports from `mobile-tab-detector.js`, `search-interface.js`, `tab-manager.js`
- `src/mobile-tab-detector.js` imports from `dom-observer.js`
- `src/search-interface.js` imports from `mobile-utils.js`
- `src/settings.js` imports from `logger.js`
- `src/dom-observer.js`, `src/mobile-utils.js`, `src/tab-manager.js`, and `src/logger.js` have no dependencies

**Making Changes:**
- **Core functionality**: Edit `src/main.js` for plugin lifecycle and coordination
- **Search coordination**: Edit `src/tab-search-manager.js` for search workflow and state management
- **Tab detection**: Edit `src/mobile-tab-detector.js` for mobile tab view detection logic (**HIGH RISK**)
- **Search interface**: Edit `src/search-interface.js` for UI components and search functionality (**HIGH RISK**)
- **Tab management**: Edit `src/tab-manager.js` for workspace integration and navigation
- **Mobile features**: Edit `src/mobile-utils.js` for mobile-specific detection and positioning
- **DOM detection**: Edit `src/dom-observer.js` for reusable DOM mutation observation
- **Settings UI**: Edit `src/settings.js` for configuration interface
- **Logging**: Edit `src/logger.js` for debug output and log levels

**Testing Changes:**
If you used the `--link` setup and your vault is synced to your mobile device, simply restart the Obsidian app on your phone/tablet after the watcher rebuilds your code.

**Critical Testing Areas:**
- Tab detection reliability when opening/closing mobile tab switcher
- Button positioning across different mobile themes and screen sizes
- Search interface responsiveness and keyboard handling
- Tab navigation accuracy

## Debugging Mobile Issues

**Console Debugging:**
1. Enable debugging in plugin settings with TRACE level logging
2. Use Chrome's remote debugging to view console output on mobile
3. Monitor the debug logs for detection failures or UI issues

**Key Debug Information:**
- Tab view detection events and success rates
- Button positioning calculations
- Search interface state changes
- Mobile theme color detection results

**Common Issues:**
- Tab detection failing due to Obsidian UI changes
- Button positioning conflicts with different mobile themes
- Search interface not responding to touch events properly
- Keyboard interactions not working as expected on mobile

## File Structure Reference

```
project-root/
├── src/                     # Source code directory
│   ├── main.js              # Entry point, plugin lifecycle
│   ├── tab-search-manager.js # Core search coordination
│   ├── mobile-tab-detector.js # Tab view state detection
│   ├── search-interface.js   # UI components and search
│   ├── tab-manager.js       # Workspace integration
│   ├── mobile-utils.js      # Mobile utilities
│   ├── dom-observer.js      # DOM mutation detection
│   ├── settings.js          # Settings UI and defaults
│   └── logger.js            # Logging system
├── .env                     # (Optional) For storing your vault path
├── main.js                  # The final, bundled plugin file (generated by build)
├── manifest.json            # Plugin metadata
├── styles.css               # CSS styles
├── package.json             # Node.js dependencies
├── install.sh               # Development installation script
└── .releaserc.json          # Release configuration
```

## Performance Considerations

**Mobile Constraints:**
- Minimize DOM queries and mutations
- Use efficient event delegation for touch events
- Debounce search input to prevent excessive filtering
- Clean up event listeners properly to prevent memory leaks

**Detection Optimization:**
- Use mutation observers instead of polling for DOM changes
- Implement fallback strategies for detection failures
- Cache DOM queries where possible
- Limit the scope of DOM observation to relevant elements