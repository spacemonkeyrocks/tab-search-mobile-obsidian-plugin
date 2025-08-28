## Contributing

Contributions are welcome!

_If you have a suggestion or find a bug, please open an issue first to discuss it._

## Plugin Architecture

The plugin source code is organized in the `src/` directory with multiple files for better maintainability:

- `src/main.js` - Entry point and core plugin class
- `src/button-manager.js` - Button creation, positioning, event handling
- `src/mobile-utils.js` - Mobile-specific functionality (detection, theme colors)
- `src/settings.js` - Settings UI and management
- `src/logger.js` - Logging utilities
- `manifest.json` - Plugin metadata (root level)
- `styles.css` - CSS styles (root level)

## Pull Requests
1. Fork the repository.
2. Create a new branch for your feature or bug fix (e.g., `feat/add-new-setting` or `fix/mobile-positioning-bug`).
3. Make your changes in the `src/` directory.
4. Test your change both on the Desktop and Mobile, see [Testing](#testing)
5. Create a commit message that follows the Conventional Commits specification, see [Commit Message Convention](#commit-message-convention).
6. Submit a pull request with a clear description of your changes.

## Testing

Thorough testing is crucial to ensure the plugin works reliably. As this is a mobile-only plugin, the primary testing should be on Android and iOS. The main test for Desktop is to ensure the plugin remains completely inactive.

Core Activation & Floating Button

- [ ] Does the floating search button appear only when the mobile tab switcher view is open?
- [ ] Does the button disappear immediately after closing the tab switcher or navigating to a tab?
- [ ] Does tapping the button correctly open the search interface?

Search Interface Functionality

- [ ] Does the search UI appear at the top of the screen?
- [ ] Does typing in the search bar filter the list of open tabs in real-time?
- [ ] Is the matching text in the search results correctly highlighted?
- [ ] Does the "Aa" (case-sensitivity) button toggle its state visually and functionally?
- [ ] Does the "X" (clear) button clear the search input?
- [ ] Does tapping a result navigate to the correct tab and close the search UI?
- [ ] Does tapping the dark overlay behind the search bar close the UI?
- [ ] Does pressing 'Escape' (on a connected keyboard, if available) close the UI?

Settings Verification

- [ ] Does disabling the plugin via the "Enable plugin" toggle prevent the button from appearing?
- [ ] Does the "Use theme colors" feature correctly detect and apply the theme's colors and position?
- [ ] When "Use theme colors" is turned off, do the manual position and size settings work as expected?
- [ ] Does changing the "Search placeholder" text update the text in the search bar?
- [ ] Does the "Max results" setting correctly limit the number of results shown?

General Reliability

- [ ] On Desktop, does the plugin correctly do nothing? (This is the expected behavior).
- [ ] Does the plugin still work correctly after reloading Obsidian?
- [ ] Does the plugin still work after opening and closing several new tabs?

## Publishing
This repository uses [semantic-release](https://github.com/semantic-release/semantic-release) to automate the release process. Publishing is handled automatically by a GitHub Action when commits are pushed to the `main` branch.

### Commit Message Convention
To trigger a release, your commit messages must follow the [Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/).

- `feat:` - A new feature. This will trigger a minor release (e.g., `1.1.0`).
- `fix:` - A bug fix. This will trigger a patch release (e.g., `1.0.1`).
- `BREAKING CHANGE:` - A commit that has a footer BREAKING CHANGE: or appends a ! after the type/scope will trigger a major release (e.g., `2.0.0`).
- Other commit types like `chore:`, `docs:`, `style:`, `refactor:`, `test:` will not trigger a release.

### The Release Process
Releasing is fully automatic:
1. When a pull request with `feat:` or `fix:` commits is merged into `main`, the release workflow is triggered.
2. `semantic-release` analyzes the commits, determines the next version number, and generates release notes.
3. The `package.json`, `manifest.json`, and `versions.json` files are automatically updated with the new version.
4. A new tag is created on GitHub.
5. A new GitHub Release is created with the release notes and the plugin files from `src/` (`main.js`, `button-manager.js`, `mobile-utils.js`, `logger.js`, `settings.js`) and root (`manifest.json`, `styles.css`) attached as assets.
6. The `brianrodri/semantic-release-obsidian-plugin` package ensures that the version in the `manifest.json` is updated to match the new version created by `semantic-release`. The new release is automatically picked up by the Obsidian Community Plugin repository, because the plugin has been [submitted](RELEASING.md#important-note-the-publishing-process).

## Debugging

### Using the builtin Debugging Tools
To get detailed information from the plugin, you must first enable the debugging options in the plugin's settings:
1. Go to `Settings` -> `Community Plugins` -> `Floating Back to Top Button`.
2. Turn on **"Enable debugging"**. This will reveal the other debug settings.
3. Turn on **"Enable console logging"** to see logs in the developer console.
4. Set the *"Log level"* to control the amount of detail you see.

**Log Levels:**
- **Info**: General lifecycle messages (e.g., "Plugin loaded").
- **Debug**: Detailed information about function calls and settings used.
- **Verbose**: More detailed information, such as which CSS selectors are being tried.
- **Trace**: The most detailed level, showing events like mouse movements.

The log file is located at: `.obsidian/plugins/back-to-top-action-btn/debug.log`

**On Mobile:**
The settings tab on mobile includes a **"Debug Info"** section. This is extremely useful as it shows a live snapshot of the last detected settings, including what the auto-detection found for the button's size and position. This information is also written to the log file.

### Android App
> Have you installed the OEM USB driver on your computer necessary for Remote Debugging for Android? If not, go to [this](https://developer.android.com/studio/run/oem-usb) webpage and select your Android device's brand and install the device driver. After installation you might have to restart your phone and computer, see Trouble Shooting for more tips.

Here are the steps to enable Remote Debugging for Android:
1. **On your Phone:** Enable Developer Options.
    - Go to `Settings` -> `About phone`.
    - Tap on `Build number` 7 times until it says "You are now a developer!"
2. **On your Phone:** Enable USB Debugging.
    - Go to `Settings` -> `System` -> `Developer options`.
    - Turn on the **USB debugging** toggle.
3. **Connect Phone to Computer:** Use a USB cable to connect your phone to your computer. On your phone, a prompt will appear asking to "Allow USB debugging". Tap "Allow".
4. **On your Computer:** Open the Chrome browser.
5. **Navigate to `chrome://inspect`**.
6. **On your Phone:** Open Obsidian.
7. You should see your phone appear under "Remote Target". Below it, you'll see an entry for Obsidian with an "inspect" link. Click **inspect**.

#### Trouble Shooting
Here are the most frequent causes and solutions for the device not showing up under devices in `chrome://inspect`:
1. **Phone Authorization:** After enabling USB debugging and plugging in the cable, a popup should appear on your phone asking you to **"Allow USB debugging"** from this specific computer. If you missed it, unplug and replug the cable. Sometimes it appears in your phone's notification shade.
2. **USB Connection Mode:** By default, most phones connect in "Charging only" mode.
    - Swipe down from the top of your phone's screen to see notifications.
    - Tap the "Charging this device via USB" notification.
    - Change the mode from "Charging only" to **"File transfer"** or **"PTP"**. This is the most common fix.
3. **Drivers (Windows Users):** If you are on Windows, you often need to install the specific ADB/USB drivers for your phone's manufacturer (e.g., Samsung, Google, etc.). You can find a list of official drivers on Google's [OEM USB Drivers page](https://developer.android.com/studio/run/oem-usb).
4. **Bad Cable or Port:**
    - Try a different USB cable. Some cheaper cables are designed for charging only and don't transfer data.
    - Try a different USB port on your computer.
5. **Restart Everything:** The classic solution. Restart your phone, restart your computer, and restart the Chrome browser.

Thank you for your help!