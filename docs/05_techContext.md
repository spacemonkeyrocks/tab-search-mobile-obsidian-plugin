# Technical Context & Stack

## 1. Technology Stack
- **Core Language:** JavaScript (ES6+)
- **Environment:** The plugin runs within the Obsidian mobile application's web view.
- **Primary API:** It leverages the official **Obsidian Plugin API** for interacting with the workspace (e.g., managing "leaves," which are Obsidian's internal term for tabs/panes).
- **Web APIs:** It makes extensive use of standard Web APIs available in modern browsers, most notably the **`MutationObserver` API** for efficiently tracking DOM changes.
- **Dependencies:** The project is self-contained and has **no external runtime dependencies**. It relies solely on the APIs provided by the Obsidian environment.

---

## 2. Development & Tooling
- **Build Process:** The project is configured for automated releases using `semantic-release`. The build command bundles the necessary JavaScript modules into the final `main.js` file.
- **Release Management:** The `.releaserc.json` file defines an automated workflow that handles version bumps, changelog generation, Git tagging, and creating a zipped release package for GitHub upon merging to the `main` branch.

---

## 3. Technical Constraints
- **DOM Fragility:** The plugin's core detection mechanism is tied to the class names and HTML structure of the Obsidian mobile app. Future updates to Obsidian could change this structure and break the plugin's functionality, requiring maintenance.
- **Mobile Performance:** All code, especially DOM manipulation and event handling, must be highly performant to ensure a smooth user experience and avoid impacting the overall responsiveness of the Obsidian app on less powerful mobile devices.