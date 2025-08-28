var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/dom-observer.js
var require_dom_observer = __commonJS({
  "src/dom-observer.js"(exports2, module2) {
    var ObsidianDOMObserver = class {
      constructor(options = {}) {
        this.logger = options.logger || console;
        this.enabled = options.enabled !== false;
        this.debounceTime = options.debounceTime || 100;
        this.observer = null;
        this.callbacks = /* @__PURE__ */ new Map();
        this.debounceTimers = /* @__PURE__ */ new Map();
        this.patterns = {
          tabSwitcher: {
            selectors: [
              ".mobile-tab-switcher",
              ".tab-switcher",
              ".workspace-tabs-mobile"
            ],
            eventType: "tab-switcher"
          },
          modal: {
            selectors: [".modal", ".overlay", '[role="dialog"]'],
            eventType: "modal"
          },
          viewActions: {
            selectors: [".view-actions", ".floating-action-btn"],
            eventType: "view-actions"
          }
        };
      }
      /**
       * Start observing DOM changes
       */
      start() {
        if (!this.enabled) {
          this.logger.debug?.("DOM Observer disabled");
          return;
        }
        if (this.observer) {
          this.stop();
        }
        this.logger.debug?.("Starting DOM Observer");
        this.observer = new MutationObserver((mutations) => {
          this.processMutations(mutations);
        });
        this.observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["class", "style", "aria-hidden"]
        });
        this.performInitialScan();
      }
      /**
       * Stop observing DOM changes
       */
      stop() {
        if (this.observer) {
          this.observer.disconnect();
          this.observer = null;
          this.logger.debug?.("DOM Observer stopped");
        }
        this.debounceTimers.forEach((timer) => clearTimeout(timer));
        this.debounceTimers.clear();
      }
      /**
       * Register a callback for specific pattern changes
       * @param {string} patternName - Name of pattern to watch
       * @param {Function} callback - Callback function (element, action, patternName)
       */
      onPatternChange(patternName, callback) {
        if (!this.callbacks.has(patternName)) {
          this.callbacks.set(patternName, /* @__PURE__ */ new Set());
        }
        this.callbacks.get(patternName).add(callback);
      }
      /**
       * Remove a callback for specific pattern changes
       */
      offPatternChange(patternName, callback) {
        const callbacks = this.callbacks.get(patternName);
        if (callbacks) {
          callbacks.delete(callback);
          if (callbacks.size === 0) {
            this.callbacks.delete(patternName);
          }
        }
      }
      /**
       * Check if a specific pattern is currently present in the DOM
       * @param {string} patternName
       * @returns {Array} Array of matching elements
       */
      getCurrentPatternElements(patternName) {
        const pattern = this.patterns[patternName];
        if (!pattern) return [];
        const elements = [];
        for (const selector of pattern.selectors) {
          const found = document.querySelectorAll(selector);
          for (const element of found) {
            if (this.isElementVisible(element)) {
              elements.push({
                element,
                selector,
                rect: element.getBoundingClientRect()
              });
            }
          }
        }
        return elements;
      }
      /**
       * Process mutation records
       */
      processMutations(mutations) {
        const relevantChanges = /* @__PURE__ */ new Map();
        for (const mutation of mutations) {
          if (mutation.type === "childList") {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const patterns = this.getMatchingPatterns(node);
                patterns.forEach((patternName) => {
                  if (!relevantChanges.has(patternName)) {
                    relevantChanges.set(patternName, /* @__PURE__ */ new Set());
                  }
                  relevantChanges.get(patternName).add({
                    element: node,
                    action: "added"
                  });
                });
              }
            });
            mutation.removedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const patterns = this.getMatchingPatterns(node);
                patterns.forEach((patternName) => {
                  if (!relevantChanges.has(patternName)) {
                    relevantChanges.set(patternName, /* @__PURE__ */ new Set());
                  }
                  relevantChanges.get(patternName).add({
                    element: node,
                    action: "removed"
                  });
                });
              }
            });
          }
          if (mutation.type === "attributes") {
            const patterns = this.getMatchingPatterns(mutation.target);
            if (patterns.length > 0) {
              patterns.forEach((patternName) => {
                if (!relevantChanges.has(patternName)) {
                  relevantChanges.set(patternName, /* @__PURE__ */ new Set());
                }
                relevantChanges.get(patternName).add({
                  element: mutation.target,
                  action: "modified",
                  attribute: mutation.attributeName
                });
              });
            }
          }
        }
        relevantChanges.forEach((changes, patternName) => {
          this.debouncePatternCallback(patternName, changes);
        });
      }
      /**
       * Get patterns that match an element
       */
      getMatchingPatterns(element) {
        const matches = [];
        for (const [patternName, pattern] of Object.entries(this.patterns)) {
          for (const selector of pattern.selectors) {
            try {
              if (element.matches?.(selector) || element.querySelector?.(selector)) {
                matches.push(patternName);
                break;
              }
            } catch (error) {
              continue;
            }
          }
        }
        return matches;
      }
      /**
       * Check if element is visible
       */
      isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.opacity !== "0" && style.visibility !== "hidden" && style.display !== "none";
      }
      /**
       * Debounce pattern callbacks to avoid spam
       */
      debouncePatternCallback(patternName, changes) {
        const existingTimer = this.debounceTimers.get(patternName);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }
        const timer = setTimeout(() => {
          this.firePatternCallbacks(patternName, changes);
          this.debounceTimers.delete(patternName);
        }, this.debounceTime);
        this.debounceTimers.set(patternName, timer);
      }
      /**
       * Fire callbacks for a pattern
       */
      firePatternCallbacks(patternName, changes) {
        const callbacks = this.callbacks.get(patternName);
        if (!callbacks) return;
        this.logger.debug?.(
          `Firing callbacks for pattern: ${patternName}, changes: ${changes.size}`
        );
        callbacks.forEach((callback) => {
          try {
            callback(Array.from(changes), patternName);
          } catch (error) {
            this.logger.error?.(
              `Error in pattern callback: ${error.message}`
            );
          }
        });
      }
      /**
       * Perform initial scan of DOM
       */
      performInitialScan() {
        this.logger.debug?.("Performing initial DOM scan");
        for (const patternName of Object.keys(this.patterns)) {
          const elements = this.getCurrentPatternElements(patternName);
          if (elements.length > 0) {
            const changes = elements.map(({ element }) => ({
              element,
              action: "initial"
            }));
            this.firePatternCallbacks(patternName, new Set(changes));
          }
        }
      }
      /**
       * Add custom pattern
       */
      addPattern(name, selectors, eventType = null) {
        this.patterns[name] = {
          selectors: Array.isArray(selectors) ? selectors : [selectors],
          eventType: eventType || name
        };
        this.logger.debug?.(`Added custom pattern: ${name}`);
      }
      /**
       * Remove custom pattern
       */
      removePattern(name) {
        delete this.patterns[name];
        this.callbacks.delete(name);
        this.logger.debug?.(`Removed pattern: ${name}`);
      }
      /**
       * Get debug information
       */
      getDebugInfo() {
        return {
          enabled: this.enabled,
          observing: !!this.observer,
          patterns: Object.keys(this.patterns),
          activeCallbacks: Array.from(this.callbacks.keys()),
          currentElements: Object.fromEntries(
            Object.keys(this.patterns).map((name) => [
              name,
              this.getCurrentPatternElements(name).length
            ])
          )
        };
      }
    };
    module2.exports = { ObsidianDOMObserver };
  }
});

// src/mobile-tab-detector.js
var require_mobile_tab_detector = __commonJS({
  "src/mobile-tab-detector.js"(exports2, module2) {
    var { ObsidianDOMObserver } = require_dom_observer();
    var MobileTabDetector = class {
      constructor(plugin) {
        this.plugin = plugin;
        this.domObserver = null;
        this.isTabViewOpen = false;
        this.callbacks = /* @__PURE__ */ new Set();
        this.debugInfo = {
          lastStateChange: null,
          detectionMethod: null,
          currentElements: [],
          eventCount: 0
        };
      }
      async initialize() {
        this.plugin.logger.logVerbose(
          "MobileTabDetector: Starting initialization with DOM observer"
        );
        this.domObserver = new ObsidianDOMObserver({
          logger: this.plugin.logger,
          enabled: this.plugin.settings?.enableDOMObserver !== false,
          debounceTime: 150
        });
        this.domObserver.onPatternChange(
          "tabSwitcher",
          (changes, patternName) => {
            this.handleTabSwitcherChanges(changes, patternName);
          }
        );
        this.domObserver.start();
        this.checkCurrentState();
        this.plugin.logger.logVerbose(
          "MobileTabDetector: Initialization complete"
        );
      }
      // eslint-disable-next-line no-unused-vars
      handleTabSwitcherChanges(changes, patternName) {
        this.plugin.logger.logDebug(
          `Tab switcher pattern change detected: ${changes.length} changes`
        );
        this.debugInfo.eventCount++;
        let hasVisibleTabSwitcher = false;
        let detectionMethod = "DOM Event";
        const currentElements = [];
        for (const change of changes) {
          const { element, action } = change;
          this.plugin.logger.logTrace(
            `Tab switcher ${action}: ${element.className || element.tagName}`
          );
          if (action === "added" || action === "initial" || action === "modified") {
            if (this.isElementVisible(element)) {
              hasVisibleTabSwitcher = true;
              currentElements.push({
                className: element.className,
                action,
                rect: element.getBoundingClientRect()
              });
            }
          }
        }
        const currentTabSwitcherElements = this.domObserver.getCurrentPatternElements("tabSwitcher");
        if (currentTabSwitcherElements.length > 0) {
          hasVisibleTabSwitcher = true;
          detectionMethod = "Current State Check";
          currentElements.push(
            ...currentTabSwitcherElements.map(
              ({ element, selector, rect }) => ({
                className: element.className,
                selector,
                action: "current",
                rect
              })
            )
          );
        }
        if (hasVisibleTabSwitcher !== this.isTabViewOpen) {
          const previousState = this.isTabViewOpen;
          this.isTabViewOpen = hasVisibleTabSwitcher;
          this.debugInfo.lastStateChange = (/* @__PURE__ */ new Date()).toLocaleTimeString();
          this.debugInfo.detectionMethod = detectionMethod;
          this.debugInfo.currentElements = currentElements;
          this.plugin.logger.logVerbose(
            `Tab view state changed: ${previousState ? "OPEN" : "CLOSED"} -> ${this.isTabViewOpen ? "OPEN" : "CLOSED"} (${detectionMethod})`
          );
          this.notifyStateChange(this.isTabViewOpen);
        }
      }
      checkCurrentState() {
        this.plugin.logger.logDebug("Checking current tab view state");
        const tabSwitcherElements = this.domObserver.getCurrentPatternElements("tabSwitcher");
        const hasVisibleTabSwitcher = tabSwitcherElements.length > 0;
        if (hasVisibleTabSwitcher !== this.isTabViewOpen) {
          this.isTabViewOpen = hasVisibleTabSwitcher;
          this.debugInfo.lastStateChange = (/* @__PURE__ */ new Date()).toLocaleTimeString();
          this.debugInfo.detectionMethod = "Initial Check";
          this.debugInfo.currentElements = tabSwitcherElements.map(
            ({ element, selector, rect }) => ({
              className: element.className,
              selector,
              action: "initial",
              rect
            })
          );
          this.plugin.logger.logVerbose(
            `Initial tab view state: ${this.isTabViewOpen ? "OPEN" : "CLOSED"}`
          );
          this.notifyStateChange(this.isTabViewOpen);
        }
      }
      isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.opacity !== "0" && style.visibility !== "hidden" && style.display !== "none";
      }
      /**
       * Register callback for tab view state changes
       * @param {Function} callback - Called with (isOpen: boolean)
       */
      onStateChange(callback) {
        this.callbacks.add(callback);
      }
      /**
       * Remove callback for tab view state changes
       */
      offStateChange(callback) {
        this.callbacks.delete(callback);
      }
      /**
       * Notify all callbacks of state change
       */
      notifyStateChange(isOpen) {
        this.callbacks.forEach((callback) => {
          try {
            callback(isOpen);
          } catch (error) {
            this.plugin.logger.logError(
              `Error in state change callback: ${error.message}`
            );
          }
        });
      }
      /**
       * Get current tab view state
       */
      isTabViewCurrentlyOpen() {
        return this.isTabViewOpen;
      }
      async findEditViewToggleButton() {
        this.plugin.logger.logDebug("Looking for edit/view toggle button");
        const toggleSelectors = [
          '.view-actions .view-action[aria-label*="Current view"]',
          ".view-actions .view-action",
          ".floating-action-btn",
          ".mod-cta .clickable-icon"
        ];
        for (const selector of toggleSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            const rect = element.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              if (rect.top > window.innerHeight / 2) {
                this.plugin.logger.logVerbose(
                  `Found edit/view toggle: ${selector}, rect: ${rect.left},${rect.top},${rect.width}x${rect.height}`
                );
                return {
                  element,
                  rect,
                  selector
                };
              }
            }
          }
        }
        this.plugin.logger.logWarn("Could not find edit/view toggle button");
        return null;
      }
      getDebugInfo() {
        const domDebugInfo = this.domObserver ? this.domObserver.getDebugInfo() : null;
        return {
          ...this.debugInfo,
          isTabViewOpen: this.isTabViewOpen,
          callbackCount: this.callbacks.size,
          domObserver: domDebugInfo
        };
      }
      cleanup() {
        this.plugin.logger.logVerbose("MobileTabDetector: Starting cleanup");
        if (this.domObserver) {
          this.domObserver.stop();
        }
        this.callbacks.clear();
        this.isTabViewOpen = false;
        this.plugin.logger.logVerbose("MobileTabDetector: Cleanup complete");
      }
    };
    module2.exports = { MobileTabDetector };
  }
});

// src/mobile-utils.js
var require_mobile_utils = __commonJS({
  "src/mobile-utils.js"(exports2, module2) {
    var MobileUtils = class {
      constructor(plugin) {
        this.plugin = plugin;
      }
      async findMobileButtonElement() {
        this.plugin.logger.logDebug(
          "Attempting to find mobile button element..."
        );
        const selectors = [
          '.view-actions .view-action[aria-label*="Current view"]',
          // Target the specific button
          ".view-actions .view-action",
          ".floating-action-btn",
          ".mod-cta .clickable-icon"
        ];
        const maxAttempts = 10;
        const intervalTime = 50;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          for (const selector of selectors) {
            this.plugin.logger.logTrace(`Checking selector "${selector}"`);
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
              const rect = element.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                if (rect.top > window.innerHeight / 2) {
                  this.plugin.logger.logVerbose(
                    `Found valid mobile button: ${rect.width}x${rect.height} at ${rect.left},${rect.top}`
                  );
                  return element;
                }
              }
            }
          }
          this.plugin.logger.logTrace(
            `Attempt ${attempt + 1}/${maxAttempts}, waiting ${intervalTime}ms`
          );
          await new Promise((resolve) => setTimeout(resolve, intervalTime));
        }
        this.plugin.logger.logWarn(
          "No mobile button found with any valid selector."
        );
        return null;
      }
      async getMobileThemeProperties() {
        this.plugin.logger.logDebug("Get mobile theme properties");
        if (this.plugin.app.isMobile && this.plugin.settings?.useThemeColors !== false) {
          const element = await this.findMobileButtonElement();
          if (element) {
            const style = getComputedStyle(element);
            const buttonColor = [
              style.backgroundColor,
              style.getPropertyValue("--interactive-accent"),
              style.getPropertyValue("--color-accent")
            ].find(
              (c) => c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent" && c.trim() !== ""
            );
            const textColor = [
              style.color,
              style.getPropertyValue("--text-on-accent"),
              style.getPropertyValue("--text-normal"),
              "#ffffff"
            ].find((c) => c && c.trim() !== "");
            const buttonOpacity = style.opacity || "1";
            if (buttonColor) {
              this.plugin.logger.logVerbose(
                `Found theme properties: bg=${buttonColor}, text=${textColor}, opacity=${buttonOpacity}`
              );
              return { buttonColor, textColor, buttonOpacity };
            }
          }
        }
        return {
          buttonColor: "var(--interactive-accent, #007acc)",
          textColor: "var(--text-on-accent, #ffffff)",
          buttonOpacity: "0.9"
        };
      }
      async detectMobileButtonPosition() {
        this.plugin.logger.logDebug("Detect mobile button position");
        if (this.plugin.app.isMobile) {
          const mobileButton = await this.findMobileButtonElement();
          if (mobileButton) {
            const rect = mobileButton.getBoundingClientRect();
            const buttonSize = Math.round(Math.max(rect.width, rect.height)) + "px";
            const bottomPos = window.innerHeight - rect.bottom + "px";
            const rightPos = window.innerWidth - rect.right + "px";
            const detectionInfo = {
              selector: mobileButton.className,
              originalRect: `${rect.left}, ${rect.top}, ${rect.width}x${rect.height}`,
              calculatedPosition: `${rightPos} from right, ${bottomPos} from bottom`,
              detectedSize: buttonSize,
              method: "exact-position"
            };
            this.plugin.logger.logDebug(
              `Mobile button positioned exactly: ${detectionInfo.calculatedPosition}`
            );
            return {
              bottom: bottomPos,
              right: rightPos,
              size: buttonSize,
              detectionInfo
            };
          }
        }
        return {
          bottom: this.plugin.settings?.bottomOffset || "120px",
          right: this.plugin.settings?.rightOffset || "20px",
          size: this.plugin.settings?.buttonSize || "50px",
          detectionInfo: {
            method: "fallback",
            reason: "Could not detect mobile button"
          }
        };
      }
      getDebugInfo() {
        return {
          isMobile: this.plugin.app.isMobile,
          timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString()
        };
      }
    };
    module2.exports = { MobileUtils };
  }
});

// src/search-interface.js
var require_search_interface = __commonJS({
  "src/search-interface.js"(exports2, module2) {
    var SearchInterface = class {
      constructor(plugin) {
        this.plugin = plugin;
        this.floatingButton = null;
        this.searchOverlay = null;
        this.searchInput = null;
        this.resultsContainer = null;
        this.currentTabs = [];
        this.filteredTabs = [];
        this.selectedIndex = -1;
        this.onTabSelect = null;
        this.onSearchClose = null;
        this.debugInfo = {
          buttonVisible: false,
          searchVisible: false,
          buttonPosition: null,
          lastUpdate: null
        };
      }
      async showFloatingButton(onClickCallback) {
        this.plugin.logger.logVerbose("Showing floating search button");
        this.hideFloatingButton();
        try {
          this.floatingButton = document.createElement("button");
          this.floatingButton.className = "tab-search-floating-btn";
          this.floatingButton.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 21L16.5 16.5M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
          this.floatingButton.title = "Search Open Tabs";
          await this.positionButton();
          this.styleButton();
          this.floatingButton.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.plugin.logger.logDebug("Floating button clicked");
            onClickCallback();
          });
          document.body.appendChild(this.floatingButton);
          setTimeout(() => {
            if (this.floatingButton) {
              this.floatingButton.style.opacity = "0.9";
              this.floatingButton.style.visibility = "visible";
            }
          }, 50);
          this.debugInfo.buttonVisible = true;
          this.debugInfo.lastUpdate = (/* @__PURE__ */ new Date()).toLocaleTimeString();
          this.plugin.logger.logVerbose(
            "Floating button displayed successfully"
          );
        } catch (error) {
          this.plugin.logger.logError(
            `Failed to show floating button: ${error.message}`
          );
        }
      }
      async positionButton() {
        const { MobileUtils } = require_mobile_utils();
        const mobileUtils = new MobileUtils(this.plugin);
        const positioning = await mobileUtils.detectMobileButtonPosition();
        if (positioning) {
          Object.assign(this.floatingButton.style, {
            bottom: positioning.bottom,
            right: positioning.right,
            width: positioning.size,
            height: positioning.size
          });
          this.debugInfo.buttonPosition = `${positioning.right} from right, ${positioning.bottom} from bottom (${positioning.detectionInfo?.method || "detected"})`;
          this.plugin.logger.logDebug(
            `Button positioned: ${this.debugInfo.buttonPosition}`
          );
        }
      }
      async styleButton() {
        const { MobileUtils } = require_mobile_utils();
        const mobileUtils = new MobileUtils(this.plugin);
        const themeProps = await mobileUtils.getMobileThemeProperties();
        Object.assign(this.floatingButton.style, {
          position: "fixed",
          borderRadius: "50%",
          border: "none",
          backgroundColor: themeProps.buttonColor,
          color: themeProps.textColor,
          cursor: "pointer",
          opacity: "0",
          visibility: "hidden",
          transition: "opacity 0.3s ease, visibility 0.3s ease, transform 0.2s ease",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: "1001",
          fontSize: "0"
        });
        const svg = this.floatingButton.querySelector("svg");
        if (svg) {
          svg.style.setProperty("width", "28px", "important");
          svg.style.setProperty("height", "28px", "important");
        }
        this.floatingButton.addEventListener("mouseenter", () => {
          this.floatingButton.style.transform = "scale(1.1)";
          this.floatingButton.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.4)";
        });
        this.floatingButton.addEventListener("mouseleave", () => {
          this.floatingButton.style.transform = "scale(1)";
          this.floatingButton.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
        });
      }
      hideFloatingButton() {
        if (this.floatingButton) {
          this.plugin.logger.logDebug("Hiding floating button");
          this.floatingButton.remove();
          this.floatingButton = null;
          this.debugInfo.buttonVisible = false;
          this.debugInfo.lastUpdate = (/* @__PURE__ */ new Date()).toLocaleTimeString();
        }
      }
      showSearchInterface(tabs, onTabSelect, onSearchClose) {
        this.plugin.logger.logVerbose(
          `Showing search interface with ${tabs.length} tabs`
        );
        this.currentTabs = tabs;
        this.filteredTabs = [];
        this.onTabSelect = onTabSelect;
        this.onSearchClose = onSearchClose;
        this.hideSearchInterface();
        try {
          this.createSearchOverlay();
          this.debugInfo.searchVisible = true;
          this.debugInfo.lastUpdate = (/* @__PURE__ */ new Date()).toLocaleTimeString();
        } catch (error) {
          this.plugin.logger.logError(
            `Failed to show search interface: ${error.message}`
          );
        }
      }
      createSearchOverlay() {
        this.searchOverlay = document.createElement("div");
        this.searchOverlay.className = "tab-search-overlay";
        Object.assign(this.searchOverlay.style, {
          position: "fixed",
          top: "0",
          left: "0",
          right: "0",
          bottom: "0",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: "1002",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "0"
        });
        const searchContainer = document.createElement("div");
        searchContainer.className = "tab-search-container";
        const topSpacer = this.plugin.settings?.topSpacer || "0px";
        Object.assign(searchContainer.style, {
          backgroundColor: "var(--background-primary)",
          borderRadius: "0 0 12px 12px",
          padding: "20px",
          width: "100%",
          maxWidth: "100%",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          borderTop: "none",
          marginTop: topSpacer
        });
        const inputContainer = document.createElement("div");
        inputContainer.className = "tab-search-input-container";
        Object.assign(inputContainer.style, {
          position: "relative",
          display: "flex",
          alignItems: "center"
        });
        const searchIcon = document.createElement("div");
        searchIcon.className = "tab-search-icon-left";
        searchIcon.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21L16.5 16.5M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        Object.assign(searchIcon.style, {
          position: "absolute",
          left: "16px",
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--text-muted)",
          pointerEvents: "none",
          zIndex: "1"
        });
        this.searchInput = document.createElement("input");
        this.searchInput.type = "text";
        this.searchInput.placeholder = this.plugin.settings?.searchPlaceholder || "Search open tabs...";
        this.searchInput.className = "tab-search-input";
        Object.assign(this.searchInput.style, {
          width: "100%",
          padding: "16px 88px 16px 48px",
          // Increased right padding for two icons
          border: "2px solid var(--background-modifier-border)",
          borderRadius: "12px",
          backgroundColor: "var(--background-secondary)",
          color: "var(--text-normal)",
          fontSize: "18px",
          outline: "none",
          boxSizing: "border-box"
        });
        const caseSensitiveButton = document.createElement("div");
        caseSensitiveButton.className = "tab-search-case-toggle";
        caseSensitiveButton.textContent = "Aa";
        caseSensitiveButton.title = "Toggle Case-Sensitive Search";
        Object.assign(caseSensitiveButton.style, {
          position: "absolute",
          right: "52px",
          // Position left of the clear icon
          top: "50%",
          transform: "translateY(-50%)",
          cursor: "pointer",
          fontFamily: "serif",
          fontWeight: "bold",
          fontSize: "18px",
          transition: "color 0.2s ease, opacity 0.2s ease",
          zIndex: "1"
        });
        const updateCaseSensitiveButtonState = () => {
          if (this.plugin.settings.caseSensitive) {
            caseSensitiveButton.style.color = "var(--interactive-accent)";
            caseSensitiveButton.style.opacity = "1";
          } else {
            caseSensitiveButton.style.color = "var(--text-muted)";
            caseSensitiveButton.style.opacity = "0.6";
          }
        };
        caseSensitiveButton.addEventListener("click", () => {
          this.plugin.settings.caseSensitive = !this.plugin.settings.caseSensitive;
          this.plugin.saveSettings();
          updateCaseSensitiveButtonState();
          this.handleSearchInput(this.searchInput.value);
        });
        const clearIcon = document.createElement("div");
        clearIcon.className = "tab-search-icon-right";
        clearIcon.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="10" cy="10" r="10" fill="var(--text-muted)" opacity="0.6"/>
                <path d="M12.5 7.5L7.5 12.5M7.5 7.5L12.5 12.5" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
        `;
        Object.assign(clearIcon.style, {
          position: "absolute",
          right: "16px",
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--text-muted)",
          cursor: "pointer",
          opacity: "0",
          transition: "opacity 0.2s ease",
          zIndex: "1"
        });
        const updateClearIcon = () => {
          if (this.searchInput.value.trim()) {
            clearIcon.style.opacity = "0.7";
          } else {
            clearIcon.style.opacity = "0";
          }
        };
        clearIcon.addEventListener("click", () => {
          this.searchInput.value = "";
          this.handleSearchInput("");
          this.searchInput.focus();
          updateClearIcon();
        });
        clearIcon.addEventListener("mouseenter", () => {
          if (this.searchInput.value.trim()) {
            clearIcon.style.opacity = "1";
          }
        });
        clearIcon.addEventListener("mouseleave", () => {
          if (this.searchInput.value.trim()) {
            clearIcon.style.opacity = "0.7";
          }
        });
        inputContainer.appendChild(searchIcon);
        inputContainer.appendChild(this.searchInput);
        inputContainer.appendChild(caseSensitiveButton);
        inputContainer.appendChild(clearIcon);
        this.resultsContainer = document.createElement("div");
        this.resultsContainer.className = "tab-search-results";
        Object.assign(this.resultsContainer.style, {
          maxHeight: "60vh",
          overflowY: "auto",
          border: "1px solid var(--background-modifier-border)",
          borderRadius: "12px",
          backgroundColor: "var(--background-secondary)"
        });
        let searchTimeout;
        this.searchInput.addEventListener("input", (e) => {
          clearTimeout(searchTimeout);
          searchTimeout = setTimeout(() => {
            this.handleSearchInput(e.target.value);
          }, 150);
          updateClearIcon();
        });
        this.searchInput.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            this.hideSearchInterface();
            if (this.onSearchClose) this.onSearchClose();
          } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            this.handleArrowKeyNavigation(e.key);
            e.preventDefault();
          } else if (e.key === "Enter") {
            this.handleEnterKey();
            e.preventDefault();
          }
        });
        this.searchOverlay.addEventListener("click", (e) => {
          if (e.target === this.searchOverlay) {
            this.hideSearchInterface();
            if (this.onSearchClose) this.onSearchClose();
          }
        });
        searchContainer.addEventListener("click", (e) => {
          e.stopPropagation();
        });
        searchContainer.appendChild(inputContainer);
        searchContainer.appendChild(this.resultsContainer);
        this.searchOverlay.appendChild(searchContainer);
        document.body.appendChild(this.searchOverlay);
        setTimeout(() => {
          this.searchInput.focus();
          this.plugin.logger.logTrace(
            "Search interface initialized, calling updateSearchResults"
          );
          this.updateSearchResults();
          updateClearIcon();
          updateCaseSensitiveButtonState();
        }, 100);
      }
      handleSearchInput(query) {
        this.plugin.logger.logTrace(`Search input: "${query}"`);
        if (!query.trim()) {
          this.filteredTabs = [];
        } else {
          if (this.plugin.settings.caseSensitive) {
            const searchQuery = query.trim();
            this.filteredTabs = this.currentTabs.filter((tab) => {
              const nameMatch = tab.displayName.includes(searchQuery);
              const pathMatch = tab.path && tab.path.includes(searchQuery);
              return nameMatch || pathMatch;
            });
          } else {
            const searchQuery = query.toLowerCase().trim();
            this.filteredTabs = this.currentTabs.filter((tab) => {
              const nameMatch = tab.displayName.toLowerCase().includes(searchQuery);
              const pathMatch = tab.path && tab.path.toLowerCase().includes(searchQuery);
              return nameMatch || pathMatch;
            });
          }
          const maxResults = this.plugin.settings?.maxResults || 20;
          if (this.filteredTabs.length > maxResults) {
            this.filteredTabs = this.filteredTabs.slice(0, maxResults);
          }
        }
        this.plugin.logger.logDebug(
          `Search "${query}" filtered ${this.currentTabs.length} tabs to ${this.filteredTabs.length} results`
        );
        this.updateSearchResults();
        this.selectedIndex = -1;
      }
      handleArrowKeyNavigation(key) {
        const resultItems = this.resultsContainer.querySelectorAll(
          ".tab-search-result-item"
        );
        if (resultItems.length === 0) return;
        resultItems.forEach((item) => {
          item.style.backgroundColor = "transparent";
          item.classList.remove("selected");
        });
        if (key === "ArrowDown") {
          this.selectedIndex = Math.min(
            this.selectedIndex + 1,
            resultItems.length - 1
          );
        } else if (key === "ArrowUp") {
          this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        }
        if (this.selectedIndex >= 0) {
          const selectedItem = resultItems[this.selectedIndex];
          selectedItem.style.backgroundColor = "var(--background-modifier-hover)";
          selectedItem.classList.add("selected");
          selectedItem.scrollIntoView({ block: "nearest" });
        }
      }
      handleEnterKey() {
        const resultItems = this.resultsContainer.querySelectorAll(
          ".tab-search-result-item"
        );
        if (this.selectedIndex >= 0 && this.selectedIndex < resultItems.length) {
          const selectedTab = this.filteredTabs[this.selectedIndex];
          if (selectedTab && this.onTabSelect) {
            this.plugin.logger.logDebug(
              `Enter key selected tab: ${selectedTab.displayName}`
            );
            this.onTabSelect(selectedTab);
          }
        } else if (this.filteredTabs.length === 1) {
          if (this.onTabSelect) {
            this.plugin.logger.logDebug(
              `Enter key selected single result: ${this.filteredTabs[0].displayName}`
            );
            this.onTabSelect(this.filteredTabs[0]);
          }
        }
      }
      updateSearchResults() {
        if (!this.resultsContainer) return;
        this.resultsContainer.innerHTML = "";
        this.selectedIndex = -1;
        const hasQuery = this.searchInput && this.searchInput.value.trim() !== "";
        if (this.filteredTabs.length === 0) {
          if (hasQuery) {
            const noResults = document.createElement("div");
            noResults.textContent = "No matching tabs found";
            Object.assign(noResults.style, {
              padding: "20px",
              textAlign: "center",
              color: "var(--text-muted)",
              fontStyle: "italic",
              fontSize: "16px"
            });
            this.resultsContainer.appendChild(noResults);
          }
          return;
        }
        this.filteredTabs.forEach((tab, index) => {
          const resultItem = document.createElement("div");
          resultItem.className = "tab-search-result-item";
          resultItem.dataset.index = index;
          Object.assign(resultItem.style, {
            padding: "16px 20px",
            cursor: "pointer",
            borderBottom: "1px solid var(--background-modifier-border)",
            color: "var(--text-normal)",
            fontSize: "16px",
            transition: "background-color 0.2s ease",
            display: "flex",
            flexDirection: "column",
            gap: "4px"
          });
          const titleEl = document.createElement("div");
          titleEl.style.fontWeight = "500";
          const query = this.searchInput ? this.searchInput.value.trim() : "";
          if (!query) {
            titleEl.textContent = tab.displayName;
          } else {
            const escapeRegExp = (string) => {
              return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            };
            const escapedQuery = escapeRegExp(query);
            const flags = this.plugin.settings.caseSensitive ? "g" : "gi";
            const regex = new RegExp(escapedQuery, flags);
            const tempDiv = document.createElement("div");
            tempDiv.textContent = tab.displayName;
            const escapedDisplayName = tempDiv.innerHTML;
            const highlightedHTML = escapedDisplayName.replace(
              regex,
              (match) => {
                return `<span class="search-highlight" style="font-weight: bold; color: var(--interactive-accent);">${match}</span>`;
              }
            );
            titleEl.innerHTML = highlightedHTML;
          }
          resultItem.appendChild(titleEl);
          const subtitleEl = document.createElement("div");
          let subtitleText = "";
          if (tab.viewType) {
            subtitleText = `${tab.viewType} view`;
          }
          if (subtitleText) {
            subtitleEl.textContent = subtitleText;
            subtitleEl.style.fontSize = "14px";
            subtitleEl.style.color = "var(--text-muted)";
            subtitleEl.style.opacity = "0.8";
            resultItem.appendChild(subtitleEl);
          }
          resultItem.addEventListener("mouseenter", () => {
            if (!resultItem.classList.contains("selected")) {
              resultItem.style.backgroundColor = "var(--background-modifier-hover)";
            }
            this.selectedIndex = index;
            this.resultsContainer.querySelectorAll(".tab-search-result-item").forEach((item, i) => {
              if (i !== index) {
                item.classList.remove("selected");
                if (!item.matches(":hover")) {
                  item.style.backgroundColor = "transparent";
                }
              }
            });
          });
          resultItem.addEventListener("mouseleave", () => {
            if (!resultItem.classList.contains("selected")) {
              resultItem.style.backgroundColor = "transparent";
            }
          });
          resultItem.addEventListener("click", () => {
            this.plugin.logger.logDebug(
              `Tab result clicked: ${tab.displayName}`
            );
            if (this.onTabSelect) {
              this.onTabSelect(tab);
            }
          });
          this.resultsContainer.appendChild(resultItem);
        });
        const items = this.resultsContainer.querySelectorAll(
          ".tab-search-result-item"
        );
        if (items.length > 0) {
          items[items.length - 1].style.borderBottom = "none";
        }
        this.plugin.logger.logTrace(
          `Displaying ${this.filteredTabs.length} search results`
        );
      }
      hideSearchInterface() {
        if (this.searchOverlay) {
          this.plugin.logger.logDebug("Hiding search interface");
          this.searchOverlay.remove();
          this.searchOverlay = null;
          this.searchInput = null;
          this.resultsContainer = null;
          this.selectedIndex = -1;
          this.debugInfo.searchVisible = false;
          this.debugInfo.lastUpdate = (/* @__PURE__ */ new Date()).toLocaleTimeString();
        }
      }
      updateStyling() {
        if (this.floatingButton) {
          this.positionButton();
        }
      }
      getDebugInfo() {
        return {
          ...this.debugInfo,
          currentTabCount: this.currentTabs.length,
          filteredTabCount: this.filteredTabs.length,
          selectedIndex: this.selectedIndex,
          hasButton: !!this.floatingButton,
          hasOverlay: !!this.searchOverlay
        };
      }
      cleanup() {
        this.plugin.logger.logDebug("SearchInterface: Cleaning up");
        this.hideFloatingButton();
        this.hideSearchInterface();
        this.currentTabs = [];
        this.filteredTabs = [];
        this.selectedIndex = -1;
        this.onTabSelect = null;
        this.onSearchClose = null;
      }
    };
    module2.exports = { SearchInterface };
  }
});

// src/tab-manager.js
var require_tab_manager = __commonJS({
  "src/tab-manager.js"(exports2, module2) {
    var TabManager = class {
      constructor(plugin) {
        this.plugin = plugin;
        this.debugInfo = {
          lastTabCount: 0,
          lastNavigation: null,
          workspaceState: null
        };
      }
      getOpenTabs() {
        this.plugin.logger.logDebug(
          "Getting open tabs from mobile tab structure and workspace"
        );
        try {
          const tabs = [];
          const mobileTabs = document.querySelectorAll(".mobile-tab");
          this.plugin.logger.logDebug(
            `Found ${mobileTabs.length} .mobile-tab elements`
          );
          mobileTabs.forEach((tabElement, index) => {
            const titleElement = tabElement.querySelector(".mobile-tab-title");
            if (titleElement) {
              const displayName = titleElement.textContent.trim();
              if (displayName) {
                tabs.push({
                  leaf: null,
                  file: null,
                  displayName,
                  path: "",
                  id: `mobile-tab-${index}`,
                  element: tabElement,
                  source: "mobile-dom"
                });
              }
            }
          });
          const workspace = this.plugin.app.workspace;
          if (workspace) {
            const allLeaves = workspace.getLeavesOfType();
            this.plugin.logger.logDebug(
              `Found ${allLeaves.length} workspace leaves`
            );
            allLeaves.forEach((leaf, index) => {
              if (!leaf.view) return;
              let displayName = "";
              let filePath = "";
              let isFileView = false;
              if (leaf.view.file) {
                displayName = leaf.view.file.basename;
                filePath = leaf.view.file.path;
                isFileView = true;
              } else {
                const viewType = leaf.view.getViewType();
                displayName = this.getDisplayNameForViewType(
                  viewType,
                  leaf
                );
                if (!displayName) return;
              }
              const matchingMobileTab = tabs.find(
                (tab) => this.tabTitlesMatch(tab.displayName, displayName)
              );
              if (matchingMobileTab) {
                matchingMobileTab.leaf = leaf;
                matchingMobileTab.file = leaf.view.file || null;
                matchingMobileTab.path = filePath;
                matchingMobileTab.id = leaf.id;
                matchingMobileTab.source = "matched";
                if (!isFileView) {
                  matchingMobileTab.viewType = leaf.view.getViewType();
                }
              } else {
                tabs.push({
                  leaf,
                  file: leaf.view.file || null,
                  displayName,
                  path: filePath,
                  id: leaf.id,
                  element: null,
                  viewType: isFileView ? void 0 : leaf.view.getViewType(),
                  source: "workspace-only"
                });
              }
            });
          }
          const uniqueTabs = [];
          const seenNames = /* @__PURE__ */ new Set();
          for (const tab of tabs) {
            if (!seenNames.has(tab.displayName.toLowerCase())) {
              seenNames.add(tab.displayName.toLowerCase());
              uniqueTabs.push(tab);
            }
          }
          this.debugInfo.lastTabCount = uniqueTabs.length;
          this.debugInfo.workspaceState = {
            activeLeafId: workspace?.activeLeaf?.id,
            totalLeaves: workspace ? workspace.getLeavesOfType().length : 0,
            mobileTabElements: mobileTabs.length,
            uniqueAfterDedup: uniqueTabs.length,
            originalCount: tabs.length
          };
          this.plugin.logger.logDebug(
            `Total tabs: ${tabs.length}, unique: ${uniqueTabs.length}`
          );
          uniqueTabs.forEach((tab, index) => {
            this.plugin.logger.logTrace(
              `Tab ${index}: "${tab.displayName}" (${tab.source}) ${tab.element ? "has-element" : "no-element"}`
            );
          });
          return uniqueTabs;
        } catch (error) {
          this.plugin.logger.logError(
            `Failed to get open tabs: ${error.message}`
          );
          return [];
        }
      }
      tabTitlesMatch(title1, title2) {
        if (!title1 || !title2) return false;
        if (title1 === title2) return true;
        if (title1.toLowerCase() === title2.toLowerCase()) return true;
        const lower1 = title1.toLowerCase();
        const lower2 = title2.toLowerCase();
        return lower1.includes(lower2) || lower2.includes(lower1);
      }
      getDisplayNameForViewType(viewType, leaf) {
        switch (viewType) {
          case "graph":
            return "Graph View";
          case "file-explorer":
            return "File Explorer";
          case "search":
            return "Search";
          case "starred":
            return "Starred";
          case "tag":
            return "Tags";
          case "outline":
            return "Outline";
          case "backlink":
            return "Backlinks";
          case "calendar":
            return "Calendar";
          case "kanban":
            return "Kanban Board";
          case "canvas": {
            const file = leaf.view?.file;
            return file ? file.basename : "Canvas";
          }
          case "pdf": {
            const pdfFile = leaf.view?.file;
            return pdfFile ? pdfFile.basename : "PDF";
          }
          case "image": {
            const imageFile = leaf.view?.file;
            return imageFile ? imageFile.basename : "Image";
          }
          case "audio": {
            const audioFile = leaf.view?.file;
            return audioFile ? audioFile.basename : "Audio";
          }
          case "video": {
            const videoFile = leaf.view?.file;
            return videoFile ? videoFile.basename : "Video";
          }
          default: {
            if (leaf.view && typeof leaf.view.getDisplayText === "function") {
              return leaf.view.getDisplayText();
            }
            return null;
          }
        }
      }
      navigateToTab(tab) {
        this.plugin.logger.logVerbose(
          `Navigating to tab: ${tab.displayName} (${tab.source})`
        );
        try {
          if (tab.element) {
            this.plugin.logger.logDebug(
              "Attempting mobile tab element click"
            );
            tab.element.click();
            const clickableChildren = tab.element.querySelectorAll(
              "[tabindex], button, .clickable"
            );
            if (clickableChildren.length > 0) {
              this.plugin.logger.logTrace(
                `Found ${clickableChildren.length} clickable child elements`
              );
              clickableChildren[0].click();
            }
            this.debugInfo.lastNavigation = {
              tabName: tab.displayName,
              method: "mobile-element-click",
              elementClass: tab.element.className,
              timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString()
            };
            this.plugin.logger.logVerbose(
              `Mobile tab clicked: ${tab.displayName}`
            );
            return true;
          }
          if (tab.leaf) {
            const workspace = this.plugin.app.workspace;
            const currentLeaves = workspace.getLeavesOfType();
            const leafExists = currentLeaves.some(
              (leaf) => leaf.id === tab.leaf.id
            );
            if (!leafExists) {
              this.plugin.logger.logWarn(
                `Leaf ${tab.leaf.id} no longer exists in workspace`
              );
              return false;
            }
            workspace.setActiveLeaf(tab.leaf);
            this.debugInfo.lastNavigation = {
              tabName: tab.displayName,
              method: "workspace-api",
              leafId: tab.leaf.id,
              timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString()
            };
            this.plugin.logger.logVerbose(
              `Workspace navigation successful: ${tab.displayName}`
            );
            return true;
          }
          this.plugin.logger.logDebug(
            "Attempting to find mobile tab by title text"
          );
          const allMobileTabs = document.querySelectorAll(".mobile-tab");
          for (const mobileTab of allMobileTabs) {
            const titleElement = mobileTab.querySelector(".mobile-tab-title");
            if (titleElement && titleElement.textContent.trim() === tab.displayName) {
              this.plugin.logger.logDebug(
                `Found matching mobile tab by title: ${tab.displayName}`
              );
              mobileTab.click();
              this.debugInfo.lastNavigation = {
                tabName: tab.displayName,
                method: "title-search-click",
                timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString()
              };
              return true;
            }
          }
          this.plugin.logger.logWarn(
            `Could not navigate to tab: ${tab.displayName} - no available method`
          );
          return false;
        } catch (error) {
          this.plugin.logger.logError(
            `Failed to navigate to tab: ${error.message}`
          );
          return false;
        }
      }
      searchTabNames(query) {
        const tabs = this.getOpenTabs();
        if (!query || !query.trim()) {
          return tabs;
        }
        const searchQuery = query.toLowerCase().trim();
        const filtered = tabs.filter(
          (tab) => tab.displayName.toLowerCase().includes(searchQuery) || tab.path.toLowerCase().includes(searchQuery)
        );
        this.plugin.logger.logDebug(
          `Searched ${tabs.length} tabs for "${query}", found ${filtered.length} matches`
        );
        return filtered;
      }
      getWorkspaceDebugInfo() {
        try {
          const workspace = this.plugin.app.workspace;
          const allLeaves = workspace.getLeavesOfType();
          return {
            totalLeaves: allLeaves.length,
            activeLeafId: workspace.activeLeaf?.id,
            activeViewType: workspace.activeLeaf?.view?.getViewType(),
            leafTypes: allLeaves.map((leaf) => ({
              id: leaf.id,
              type: leaf.view?.getViewType(),
              displayText: leaf.view?.getDisplayText?.() || "N/A"
            }))
          };
        } catch (error) {
          return { error: error.message };
        }
      }
      getDebugInfo() {
        return {
          ...this.debugInfo,
          workspace: this.getWorkspaceDebugInfo()
        };
      }
    };
    module2.exports = { TabManager };
  }
});

// src/tab-search-manager.js
var require_tab_search_manager = __commonJS({
  "src/tab-search-manager.js"(exports2, module2) {
    var { MobileTabDetector } = require_mobile_tab_detector();
    var { SearchInterface } = require_search_interface();
    var { TabManager } = require_tab_manager();
    var TabSearchManager2 = class {
      constructor(plugin) {
        this.plugin = plugin;
        this.mobileDetector = new MobileTabDetector(plugin);
        this.searchInterface = new SearchInterface(plugin);
        this.tabManager = new TabManager(plugin);
        this.isTabViewOpen = false;
        this.isSearchActive = false;
        this.cleanupCallbacks = [];
      }
      async initialize() {
        this.plugin.logger.logVerbose(
          "TabSearchManager: Starting initialization with event-based detection"
        );
        try {
          await this.mobileDetector.initialize();
          this.mobileDetector.onStateChange((isOpen) => {
            this.handleTabViewStateChange(isOpen);
          });
          this.plugin.logger.logVerbose(
            "TabSearchManager: Initialization complete"
          );
        } catch (error) {
          this.plugin.logger.logError(
            `TabSearchManager initialization failed: ${error.message}`
          );
        }
      }
      handleTabViewStateChange(isOpen) {
        this.plugin.logger.logVerbose(
          `Tab view state changed via event: ${this.isTabViewOpen ? "OPEN" : "CLOSED"} -> ${isOpen ? "OPEN" : "CLOSED"}`
        );
        const previousState = this.isTabViewOpen;
        this.isTabViewOpen = isOpen;
        if (isOpen && !previousState) {
          this.handleTabViewOpened();
        } else if (!isOpen && previousState) {
          this.handleTabViewClosed();
        }
      }
      handleTabViewOpened() {
        this.plugin.logger.logVerbose(
          "Tab view opened - showing search button"
        );
        try {
          this.searchInterface.showFloatingButton(
            () => this.handleSearchButtonClick()
          );
        } catch (error) {
          this.plugin.logger.logError(
            `Failed to show search button: ${error.message}`
          );
        }
      }
      handleTabViewClosed() {
        this.plugin.logger.logVerbose(
          "Tab view closed - cleaning up interface"
        );
        try {
          this.searchInterface.hideFloatingButton();
          if (this.isSearchActive) {
            this.searchInterface.hideSearchInterface();
            this.isSearchActive = false;
          }
        } catch (error) {
          this.plugin.logger.logError(
            `Failed to cleanup interface: ${error.message}`
          );
        }
      }
      async handleSearchButtonClick() {
        this.plugin.logger.logVerbose("Search button clicked");
        if (this.isSearchActive) {
          this.searchInterface.hideSearchInterface();
          this.isSearchActive = false;
        } else {
          const openTabs = this.tabManager.getOpenTabs();
          this.plugin.logger.logDebug(`Found ${openTabs.length} open tabs`);
          this.searchInterface.showSearchInterface(
            openTabs,
            (selectedTab) => this.handleTabSelection(selectedTab),
            () => this.handleSearchClosed()
          );
          this.isSearchActive = true;
        }
      }
      handleTabSelection(selectedTab) {
        this.plugin.logger.logVerbose(
          `Tab selected: ${selectedTab.displayName}`
        );
        try {
          this.tabManager.navigateToTab(selectedTab);
          this.searchInterface.hideSearchInterface();
          this.isSearchActive = false;
        } catch (error) {
          this.plugin.logger.logError(
            `Failed to navigate to tab: ${error.message}`
          );
        }
      }
      handleSearchClosed() {
        this.plugin.logger.logTrace("Search interface closed by user");
        this.isSearchActive = false;
      }
      handleWorkspaceChange() {
        this.plugin.logger.logTrace(
          "Workspace changed - event-based detection will handle state changes automatically"
        );
      }
      handleSettingsChange() {
        this.plugin.logger.logDebug("Settings changed - updating components");
        if (this.isTabViewOpen) {
          this.searchInterface.updateStyling();
        }
      }
      getDebugInfo() {
        return {
          isTabViewOpen: this.isTabViewOpen,
          isSearchActive: this.isSearchActive,
          detectorInfo: this.mobileDetector.getDebugInfo(),
          interfaceInfo: this.searchInterface.getDebugInfo(),
          tabInfo: this.tabManager.getDebugInfo(),
          timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString()
        };
      }
      cleanup() {
        this.plugin.logger.logVerbose("TabSearchManager: Starting cleanup");
        if (this.mobileDetector) {
          this.mobileDetector.cleanup();
        }
        this.cleanupCallbacks.forEach((callback) => {
          try {
            callback();
          } catch (error) {
            this.plugin.logger.logWarn(
              `Cleanup callback failed: ${error.message}`
            );
          }
        });
        if (this.searchInterface) {
          this.searchInterface.cleanup();
        }
        this.cleanupCallbacks = [];
        this.isTabViewOpen = false;
        this.isSearchActive = false;
        this.plugin.logger.logVerbose("TabSearchManager: Cleanup complete");
      }
    };
    module2.exports = { TabSearchManager: TabSearchManager2 };
  }
});

// src/logger.js
var require_logger = __commonJS({
  "src/logger.js"(exports2, module2) {
    var LogLevel2 = {
      NONE: 0,
      ERROR: 1,
      WARN: 2,
      INFO: 3,
      DEBUG: 4,
      VERBOSE: 5,
      TRACE: 6
    };
    var Logger2 = class {
      constructor(plugin) {
        this.plugin = plugin;
      }
      async logTo(message, level = LogLevel2.INFO, forceConsole = false, type = "both") {
        if ((this.plugin.settings?.logLevel ?? LogLevel2.INFO) < level && !forceConsole) {
          return;
        }
        const platform = this.plugin.app?.isMobile ? "Mobile" : "Desktop";
        const timestamp = (/* @__PURE__ */ new Date()).toISOString();
        const levelName = Object.keys(LogLevel2).find((key) => LogLevel2[key] === level) || "INFO";
        const logMessage = `[${timestamp}] [${platform}] [TabSearch] [${levelName.padEnd(7, " ")}] ${message}`;
        if (this.plugin.settings?.enableDebugging || forceConsole) {
          if (type === "console" || type === "both") {
            console.log(logMessage);
          }
        }
        if (this.plugin.settings?.enableDebugging && this.plugin.settings?.enableFileLogging) {
          if (type === "file" || type === "both") {
            if (this.plugin.app?.vault?.adapter) {
              try {
                const adapter = this.plugin.app.vault.adapter;
                const logPath = ".obsidian/plugins/tab-search-mobile/debug.log";
                await adapter.append(logPath, logMessage + "\n");
              } catch (error) {
                console.error(
                  "TabSearchPlugin: FAILED TO WRITE TO LOG FILE:",
                  error
                );
              }
            }
          }
        }
      }
      // Errors are always forced to the console
      logError(message, type = "both") {
        this.logTo(message, LogLevel2.ERROR, true, type);
      }
      logWarn(message, forceConsole = false, type = "both") {
        this.logTo(message, LogLevel2.WARN, forceConsole, type);
      }
      logInfo(message, forceConsole = false, type = "both") {
        this.logTo(message, LogLevel2.INFO, forceConsole, type);
      }
      logVerbose(message, forceConsole = false, type = "both") {
        this.logTo(message, LogLevel2.VERBOSE, forceConsole, type);
      }
      logDebug(message, forceConsole = false, type = "both") {
        this.logTo(message, LogLevel2.DEBUG, forceConsole, type);
      }
      logTrace(message, forceConsole = false, type = "both") {
        this.logTo(message, LogLevel2.TRACE, forceConsole, type);
      }
    };
    module2.exports = { Logger: Logger2, LogLevel: LogLevel2 };
  }
});

// src/settings.js
var require_settings = __commonJS({
  "src/settings.js"(exports2, module2) {
    var { PluginSettingTab, Setting } = require("obsidian");
    var { LogLevel: LogLevel2 } = require_logger();
    var DEFAULT_SETTINGS2 = {
      // Basic functionality
      enabled: true,
      // Button positioning and theming
      buttonSize: "50px",
      bottomOffset: "20px",
      rightOffset: "20px",
      buttonOffset: "20px",
      useThemeColors: true,
      // Search interface positioning
      topSpacer: "30px",
      // Search behavior
      searchPlaceholder: "Search open tabs...",
      maxResults: 20,
      caseSensitive: false,
      // New setting for the toggle
      // Debugging
      enableDebugging: false,
      enableFileLogging: false,
      logLevel: LogLevel2.INFO,
      autoDowngradeLevelMinutes: 5,
      // Detection settings
      detectionInterval: 200,
      enableDOMObserver: true,
      // UI styling
      buttonOpacity: "0.9",
      overlayOpacity: "0.5"
    };
    var TabSearchSettingTab2 = class extends PluginSettingTab {
      constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
      }
      display() {
        const containerEl = this.containerEl;
        containerEl.empty();
        const isMobile = this.app.isMobile;
        containerEl.createEl("h2", { text: "Tab Search Plugin Settings" });
        const infoBox = containerEl.createEl("div", {
          cls: "setting-item-info"
        });
        infoBox.createEl("div", {
          text: `${this.plugin.manifest?.name || "Tab Search Plugin"} v${this.plugin.manifest?.version || "0.1.0"}`
        });
        infoBox.createEl("div", {
          text: `Currently running on: ${isMobile ? "Mobile" : "Desktop"}`
        });
        if (!isMobile) {
          const warningEl = infoBox.createEl("div", {
            text: "\u26A0\uFE0F This plugin only functions on mobile devices.",
            cls: "mod-warning"
          });
          warningEl.style.color = "var(--text-error)";
          warningEl.style.fontWeight = "bold";
        }
        infoBox.style.marginBottom = "20px";
        infoBox.style.padding = "10px";
        infoBox.style.backgroundColor = "var(--background-secondary)";
        infoBox.style.borderRadius = "5px";
        containerEl.createEl("h3", { text: "Basic Settings" });
        new Setting(containerEl).setName("Enable plugin").setDesc("Enable or disable the tab search functionality").addToggle(
          (toggle) => toggle.setValue(this.plugin.settings.enabled).onChange(async (value) => {
            this.plugin.settings.enabled = value;
            await this.plugin.saveSettings();
          })
        );
        containerEl.createEl("h3", { text: "Button Settings" });
        new Setting(containerEl).setName("Use theme colors").setDesc("Automatically match mobile theme colors and positioning").addToggle(
          (toggle) => toggle.setValue(this.plugin.settings.useThemeColors).onChange(async (value) => {
            this.plugin.settings.useThemeColors = value;
            await this.plugin.saveSettings();
            this.display();
          })
        );
        if (!this.plugin.settings.useThemeColors) {
          const manualGroup = containerEl.createEl("div");
          manualGroup.style.marginLeft = "20px";
          manualGroup.style.paddingLeft = "15px";
          manualGroup.style.borderLeft = "3px solid var(--interactive-accent)";
          manualGroup.style.marginTop = "10px";
          manualGroup.style.marginBottom = "15px";
          new Setting(manualGroup).setName("Button size").setDesc("Size of the floating search button").addText(
            (text) => text.setPlaceholder("50px").setValue(
              this.plugin.settings.buttonSize.replace("px", "")
            ).onChange(async (value) => {
              this.plugin.settings.buttonSize = value + "px";
              await this.plugin.saveSettings();
            })
          );
          new Setting(manualGroup).setName("Bottom offset").setDesc("Distance from bottom of screen").addText(
            (text) => text.setPlaceholder("20px").setValue(
              this.plugin.settings.bottomOffset.replace("px", "")
            ).onChange(async (value) => {
              this.plugin.settings.bottomOffset = value + "px";
              await this.plugin.saveSettings();
            })
          );
          new Setting(manualGroup).setName("Right offset").setDesc("Distance from right of screen").addText(
            (text) => text.setPlaceholder("20px").setValue(
              this.plugin.settings.rightOffset.replace("px", "")
            ).onChange(async (value) => {
              this.plugin.settings.rightOffset = value + "px";
              await this.plugin.saveSettings();
            })
          );
        } else {
          new Setting(containerEl).setName("Button offset").setDesc("Distance above the mobile edit/view button").addText(
            (text) => text.setPlaceholder("20px").setValue(
              this.plugin.settings.buttonOffset.replace("px", "")
            ).onChange(async (value) => {
              this.plugin.settings.buttonOffset = value + "px";
              await this.plugin.saveSettings();
            })
          );
        }
        new Setting(containerEl).setName("Button opacity").setDesc("Transparency of the button (0.1 to 1.0)").addText(
          (text) => text.setPlaceholder("0.9").setValue(this.plugin.settings.buttonOpacity).onChange(async (value) => {
            const opacity = parseFloat(value);
            if (opacity >= 0.1 && opacity <= 1) {
              this.plugin.settings.buttonOpacity = value;
              await this.plugin.saveSettings();
            }
          })
        );
        containerEl.createEl("h3", { text: "Search Settings" });
        new Setting(containerEl).setName("Top spacing").setDesc("Distance from top of screen to search interface").addText(
          (text) => text.setPlaceholder("0px").setValue(this.plugin.settings.topSpacer.replace("px", "")).onChange(async (value) => {
            this.plugin.settings.topSpacer = value + "px";
            await this.plugin.saveSettings();
          })
        );
        new Setting(containerEl).setName("Search placeholder").setDesc("Placeholder text for search input").addText(
          (text) => text.setPlaceholder("Search open tabs...").setValue(this.plugin.settings.searchPlaceholder).onChange(async (value) => {
            this.plugin.settings.searchPlaceholder = value || "Search open tabs...";
            await this.plugin.saveSettings();
          })
        );
        new Setting(containerEl).setName("Max results").setDesc("Maximum number of search results to show").addText(
          (text) => text.setPlaceholder("20").setValue(this.plugin.settings.maxResults.toString()).onChange(async (value) => {
            const num = parseInt(value);
            if (num > 0 && num <= 100) {
              this.plugin.settings.maxResults = num;
              await this.plugin.saveSettings();
            }
          })
        );
        containerEl.createEl("h3", { text: "Debug Settings" });
        new Setting(containerEl).setName("Enable debugging").setDesc("Enable debug logging to console and/or file").addToggle(
          (toggle) => toggle.setValue(this.plugin.settings.enableDebugging).onChange(async (value) => {
            this.plugin.settings.enableDebugging = value;
            await this.plugin.saveSettings();
            this.display();
          })
        );
        if (this.plugin.settings.enableDebugging) {
          new Setting(containerEl).setName("Log level").setDesc("Set the level of detail for logs").addDropdown(
            (dropdown) => dropdown.addOption(LogLevel2.ERROR.toString(), "Error").addOption(LogLevel2.WARN.toString(), "Warning").addOption(LogLevel2.INFO.toString(), "Info").addOption(LogLevel2.VERBOSE.toString(), "Verbose").addOption(LogLevel2.DEBUG.toString(), "Debug").addOption(LogLevel2.TRACE.toString(), "Trace").setValue(this.plugin.settings.logLevel.toString()).onChange(async (value) => {
              this.plugin.settings.logLevel = parseInt(value, 10);
              await this.plugin.saveSettings();
              this.display();
            })
          );
          const highLogLevels = [
            LogLevel2.VERBOSE,
            LogLevel2.DEBUG,
            LogLevel2.TRACE
          ];
          if (highLogLevels.includes(this.plugin.settings.logLevel)) {
            new Setting(containerEl).setName("Auto downgrade log level").setDesc(
              'Automatically reset log level to "Info" after a set time (minutes). Set to 0 to disable.'
            ).addText(
              (text) => text.setValue(
                this.plugin.settings.autoDowngradeLevelMinutes.toString()
              ).onChange(async (value) => {
                this.plugin.settings.autoDowngradeLevelMinutes = parseInt(value, 10) || 0;
                await this.plugin.saveSettings();
              })
            );
          }
          new Setting(containerEl).setName("Enable file logging").setDesc(
            "Also write log messages to a file in the plugin directory"
          ).addToggle(
            (toggle) => toggle.setValue(this.plugin.settings.enableFileLogging).onChange(async (value) => {
              this.plugin.settings.enableFileLogging = value;
              await this.plugin.saveSettings();
            })
          );
          const debugInfo = containerEl.createEl("div", {
            cls: "setting-item-info"
          });
          debugInfo.innerHTML = `
                <strong>Debug log location:</strong><br>
                <code>.obsidian/plugins/tab-search-mobile/debug.log</code>
            `;
          debugInfo.style.marginTop = "10px";
          debugInfo.style.padding = "10px";
          debugInfo.style.backgroundColor = "var(--background-secondary)";
          debugInfo.style.borderRadius = "5px";
          debugInfo.style.fontSize = "12px";
        }
        if (isMobile && this.plugin.tabSearchManager) {
          const debugSection = containerEl.createEl("details");
          debugSection.createEl("summary", { text: "Debug Info (Live)" });
          const debugContent = debugSection.createEl("div");
          debugContent.style.padding = "10px";
          debugContent.style.backgroundColor = "var(--background-secondary)";
          debugContent.style.borderRadius = "5px";
          debugContent.style.fontFamily = "monospace";
          debugContent.style.fontSize = "11px";
          const debugInfo = this.plugin.tabSearchManager.getDebugInfo();
          debugContent.innerHTML = `
                <strong>Plugin Status:</strong><br>
                \u2022 Tab View Open: ${debugInfo.isTabViewOpen ? "YES" : "NO"}<br>
                \u2022 Search Active: ${debugInfo.isSearchActive ? "YES" : "NO"}<br>
                \u2022 Last Update: ${debugInfo.timestamp}<br><br>
                
                <strong>Detection Info:</strong><br>
                \u2022 Method: ${debugInfo.detectorInfo?.detectionMethod || "Unknown"}<br>
                \u2022 Last Check: ${debugInfo.detectorInfo?.lastCheck || "Never"}<br>
                \u2022 Indicators: ${debugInfo.detectorInfo?.tabViewIndicators?.length || 0}<br><br>
                
                <strong>Interface Info:</strong><br>
                \u2022 Button Visible: ${debugInfo.interfaceInfo?.buttonVisible ? "YES" : "NO"}<br>
                \u2022 Search Visible: ${debugInfo.interfaceInfo?.searchVisible ? "YES" : "NO"}<br>
                \u2022 Button Position: ${debugInfo.interfaceInfo?.buttonPosition || "Unknown"}<br><br>
                
                <strong>Tab Info:</strong><br>
                \u2022 Open Tabs: ${debugInfo.tabInfo?.lastTabCount || 0}<br>
                \u2022 Last Navigation: ${debugInfo.tabInfo?.lastNavigation?.tabName || "None"}<br>
                \u2022 Workspace Leaves: ${debugInfo.tabInfo?.workspace?.totalLeaves || 0}
            `;
          const refreshBtn = debugContent.createEl("button", {
            text: "Refresh Debug Info"
          });
          refreshBtn.style.marginTop = "10px";
          refreshBtn.onclick = () => this.display();
        }
      }
    };
    module2.exports = { TabSearchSettingTab: TabSearchSettingTab2, DEFAULT_SETTINGS: DEFAULT_SETTINGS2 };
  }
});

// src/main.js
var { Plugin } = require("obsidian");
var { TabSearchManager } = require_tab_search_manager();
var { TabSearchSettingTab, DEFAULT_SETTINGS } = require_settings();
var { Logger, LogLevel } = require_logger();
var TabSearchPlugin = class extends Plugin {
  logDowngradeTimer = null;
  async onload() {
    try {
      this.logger = new Logger(this);
      await this.loadSettings();
      if (!this.app.isMobile) {
        this.logger.logError("Tab Search Plugin: This plugin is designed exclusively for mobile devices and will not function on desktop.", true, "console");
        const { Notice } = require("obsidian");
        new Notice("Tab Search Plugin: This plugin only works on mobile devices.", 8e3);
        this.disabled = true;
        return;
      }
      this.logger.logInfo("Loading Tab Search Plugin (Mobile)", true, "console");
      this.tabSearchManager = new TabSearchManager(this);
      this.addSettingTab(new TabSearchSettingTab(this.app, this));
      this.logger.logDebug("Settings loaded and tab added successfully");
      this.app.workspace.onLayoutReady(() => {
        this.logger.logVerbose("Workspace layout ready. Starting tab detection.");
        this.tabSearchManager.initialize();
      });
      this.registerEvent(
        this.app.workspace.on("active-leaf-change", () => {
          this.logger.logTrace("Active leaf changed - checking tab view state");
          this.tabSearchManager.handleWorkspaceChange();
        })
      );
      this.startLogDowngradeTimer();
      this.logger.logDebug("Plugin initialization complete");
    } catch (error) {
      console.error("TabSearchPlugin: FATAL error in onload:", error);
      if (this.logger) {
        this.logger.logError(`FATAL error in onload: ${error.stack || error}`);
      }
    }
  }
  startLogDowngradeTimer() {
    if (this.logDowngradeTimer) {
      clearTimeout(this.logDowngradeTimer);
    }
    const highLogLevels = [LogLevel.VERBOSE, LogLevel.DEBUG, LogLevel.TRACE];
    const shouldDowngrade = this.settings.autoDowngradeLevelMinutes > 0 && highLogLevels.includes(this.settings.logLevel);
    if (shouldDowngrade) {
      const delayInMs = this.settings.autoDowngradeLevelMinutes * 60 * 1e3;
      this.logger.logVerbose(`Log level will auto-downgrade to INFO in ${this.settings.autoDowngradeLevelMinutes} minutes.`);
      this.logDowngradeTimer = setTimeout(() => {
        this.logger.logVerbose("Auto-downgrading log level to INFO.");
        this.settings.logLevel = LogLevel.INFO;
        this.saveSettings();
      }, delayInMs);
    }
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    if (this.disabled) return;
    this.logger.logDebug("Saving settings");
    await this.saveData(this.settings);
    if (this.tabSearchManager) {
      this.tabSearchManager.handleSettingsChange();
    }
    this.startLogDowngradeTimer();
  }
  onunload() {
    this.logger?.logInfo("Unloading Tab Search Plugin", true);
    if (this.logDowngradeTimer) {
      clearTimeout(this.logDowngradeTimer);
    }
    if (this.tabSearchManager) {
      this.tabSearchManager.cleanup();
    }
  }
};
module.exports = TabSearchPlugin;
