const { ObsidianDOMObserver } = require('./dom-observer');

class MobileTabDetector {
    constructor(plugin) {
        this.plugin = plugin;
        this.domObserver = null;
        this.isTabViewOpen = false;
        this.callbacks = new Set();

        this.debugInfo = {
            lastStateChange: null,
            detectionMethod: null,
            currentElements: [],
            eventCount: 0,
        };
    }

    async initialize() {
        this.plugin.logger.logInfo(
            'MobileTabDetector: Starting initialization with DOM observer'
        );

        // Initialize DOM observer
        this.domObserver = new ObsidianDOMObserver({
            logger: this.plugin.logger,
            enabled: this.plugin.settings?.enableDOMObserver !== false,
            debounceTime: 150,
        });

        // Register for tab-switcher pattern changes
        this.domObserver.onPatternChange(
            'tabSwitcher',
            (changes, patternName) => {
                this.handleTabSwitcherChanges(changes, patternName);
            }
        );

        // Start observing
        this.domObserver.start();

        // Check initial state
        this.checkCurrentState();

        this.plugin.logger.logInfo(
            'MobileTabDetector: Initialization complete'
        );
    }

    // eslint-disable-next-line no-unused-vars
    handleTabSwitcherChanges(changes, patternName) {
        this.plugin.logger.logDebug(
            `Tab switcher pattern change detected: ${changes.length} changes`
        );

        this.debugInfo.eventCount++;

        let hasVisibleTabSwitcher = false;
        let detectionMethod = 'DOM Event';
        const currentElements = [];

        // Check each change
        for (const change of changes) {
            const { element, action } = change;

            this.plugin.logger.logTrace(
                `Tab switcher ${action}: ${element.className || element.tagName}`
            );

            if (
                action === 'added' ||
                action === 'initial' ||
                action === 'modified'
            ) {
                if (this.isElementVisible(element)) {
                    hasVisibleTabSwitcher = true;
                    currentElements.push({
                        className: element.className,
                        action: action,
                        rect: element.getBoundingClientRect(),
                    });
                }
            }
        }

        // Also check current state to be sure
        const currentTabSwitcherElements =
            this.domObserver.getCurrentPatternElements('tabSwitcher');
        if (currentTabSwitcherElements.length > 0) {
            hasVisibleTabSwitcher = true;
            detectionMethod = 'Current State Check';
            currentElements.push(
                ...currentTabSwitcherElements.map(
                    ({ element, selector, rect }) => ({
                        className: element.className,
                        selector: selector,
                        action: 'current',
                        rect: rect,
                    })
                )
            );
        }

        // Update state if changed
        if (hasVisibleTabSwitcher !== this.isTabViewOpen) {
            const previousState = this.isTabViewOpen;
            this.isTabViewOpen = hasVisibleTabSwitcher;

            this.debugInfo.lastStateChange = new Date().toLocaleTimeString();
            this.debugInfo.detectionMethod = detectionMethod;
            this.debugInfo.currentElements = currentElements;

            this.plugin.logger.logInfo(
                `Tab view state changed: ${previousState ? 'OPEN' : 'CLOSED'} -> ${this.isTabViewOpen ? 'OPEN' : 'CLOSED'} (${detectionMethod})`
            );

            // Notify callbacks
            this.notifyStateChange(this.isTabViewOpen);
        }
    }

    checkCurrentState() {
        this.plugin.logger.logDebug('Checking current tab view state');

        const tabSwitcherElements =
            this.domObserver.getCurrentPatternElements('tabSwitcher');
        const hasVisibleTabSwitcher = tabSwitcherElements.length > 0;

        if (hasVisibleTabSwitcher !== this.isTabViewOpen) {
            this.isTabViewOpen = hasVisibleTabSwitcher;
            this.debugInfo.lastStateChange = new Date().toLocaleTimeString();
            this.debugInfo.detectionMethod = 'Initial Check';
            this.debugInfo.currentElements = tabSwitcherElements.map(
                ({ element, selector, rect }) => ({
                    className: element.className,
                    selector: selector,
                    action: 'initial',
                    rect: rect,
                })
            );

            this.plugin.logger.logInfo(
                `Initial tab view state: ${this.isTabViewOpen ? 'OPEN' : 'CLOSED'}`
            );

            // Notify callbacks
            this.notifyStateChange(this.isTabViewOpen);
        }
    }

    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);

        return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.opacity !== '0' &&
            style.visibility !== 'hidden' &&
            style.display !== 'none'
        );
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
        this.plugin.logger.logDebug('Looking for edit/view toggle button');

        const toggleSelectors = [
            '.view-actions .view-action[aria-label*="Current view"]',
            '.view-actions .view-action',
            '.floating-action-btn',
            '.mod-cta .clickable-icon',
        ];

        for (const selector of toggleSelectors) {
            const elements = document.querySelectorAll(selector);

            for (const element of elements) {
                const rect = element.getBoundingClientRect();

                if (rect.width > 0 && rect.height > 0) {
                    // Check if it's in the bottom area (mobile floating buttons)
                    if (rect.top > window.innerHeight / 2) {
                        this.plugin.logger.logVerbose(
                            `Found edit/view toggle: ${selector}, rect: ${rect.left},${rect.top},${rect.width}x${rect.height}`
                        );
                        return {
                            element: element,
                            rect: rect,
                            selector: selector,
                        };
                    }
                }
            }
        }

        this.plugin.logger.logWarn('Could not find edit/view toggle button');
        return null;
    }

    getDebugInfo() {
        const domDebugInfo = this.domObserver
            ? this.domObserver.getDebugInfo()
            : null;

        return {
            ...this.debugInfo,
            isTabViewOpen: this.isTabViewOpen,
            callbackCount: this.callbacks.size,
            domObserver: domDebugInfo,
        };
    }

    cleanup() {
        this.plugin.logger.logInfo('MobileTabDetector: Starting cleanup');

        if (this.domObserver) {
            this.domObserver.stop();
        }

        this.callbacks.clear();
        this.isTabViewOpen = false;

        this.plugin.logger.logInfo('MobileTabDetector: Cleanup complete');
    }
}

module.exports = { MobileTabDetector };
