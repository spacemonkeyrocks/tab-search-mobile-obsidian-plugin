# Project Brief: Tab Search for Obsidian Mobile

## 1. Overview
This project is a quality-of-life plugin for the Obsidian note-taking application, built exclusively for the mobile platform. It introduces a fast and intuitive search functionality directly into the mobile "tab switcher" screen. The primary goal is to empower users who manage numerous open tabs to find and navigate to a specific tab with ease, significantly improving the app's usability on the go.

---

## 2. Project Goals
- **Enhance User Experience:** Eliminate the need for users to manually scroll through a long list of open tabs on a small screen.
- **Provide Intuitive Search:** Deliver a real-time, "search-as-you-type" interface that feels responsive and powerful.
- **Seamless Integration:** Ensure the plugin's UI feels like a native part of the Obsidian mobile app by dynamically adapting to the user's theme and layout.
- **High Configurability:** Allow users to customize the plugin's appearance and behavior through a dedicated settings panel.

---

## 3. Core Requirements
- **Context-Aware Activation:** The plugin's UI must only appear when the user is on the mobile tab switcher screen and disappear otherwise.
- **Floating Action Button:** A floating search button will serve as the entry point to the search functionality.
- **Search Overlay:** Tapping the button must open a non-intrusive overlay containing a search bar and a results panel.
- **Real-Time Filtering:** The list of tabs must filter instantly as the user types a query into the search bar.
- **Tab Navigation:** Selecting a search result must immediately close the search interface and navigate the user to the chosen tab.

---

## 4. Constraints & Scope
- **Mobile-Only Platform:** This plugin is designed from the ground up for mobile devices. It will not function on the desktop version of Obsidian and includes a check to disable itself on non-mobile platforms.
- **Dependency on DOM Structure:** The plugin's ability to detect the tab switcher view relies on observing specific class names and structures in Obsidian's HTML (the DOM). This creates a dependency on the app's internal structure, which could be altered in future Obsidian updates, potentially requiring plugin maintenance.