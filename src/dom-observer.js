/**
 * ObsidianDOMObserver - Reusable library for detecting Obsidian UI state changes
 * Can be shared across multiple plugins that need to detect mobile UI states
 */

class ObsidianDOMObserver {
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.enabled = options.enabled !== false;
        this.debounceTime = options.debounceTime || 100;

        this.observer = null;
        this.callbacks = new Map();
        this.debounceTimers = new Map();

        // Known Obsidian mobile UI patterns
        this.patterns = {
            tabSwitcher: {
                selectors: [
                    '.mobile-tab-switcher',
                    '.tab-switcher',
                    '.workspace-tabs-mobile',
                ],
                eventType: 'tab-switcher',
            },
            modal: {
                selectors: ['.modal', '.overlay', '[role="dialog"]'],
                eventType: 'modal',
            },
            viewActions: {
                selectors: ['.view-actions', '.floating-action-btn'],
                eventType: 'view-actions',
            },
        };
    }

    /**
     * Start observing DOM changes
     */
    start() {
        if (!this.enabled) {
            this.logger.debug?.('DOM Observer disabled');
            return;
        }

        if (this.observer) {
            this.stop();
        }

        this.logger.debug?.('Starting DOM Observer');

        this.observer = new MutationObserver((mutations) => {
            this.processMutations(mutations);
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'aria-hidden'],
        });

        // Initial scan
        this.performInitialScan();
    }

    /**
     * Stop observing DOM changes
     */
    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
            this.logger.debug?.('DOM Observer stopped');
        }

        // Clear debounce timers
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
            this.callbacks.set(patternName, new Set());
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
                        rect: element.getBoundingClientRect(),
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
        const relevantChanges = new Map();

        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                // Handle added nodes
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const patterns = this.getMatchingPatterns(node);
                        patterns.forEach((patternName) => {
                            if (!relevantChanges.has(patternName)) {
                                relevantChanges.set(patternName, new Set());
                            }
                            relevantChanges.get(patternName).add({
                                element: node,
                                action: 'added',
                            });
                        });
                    }
                });

                // Handle removed nodes
                mutation.removedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const patterns = this.getMatchingPatterns(node);
                        patterns.forEach((patternName) => {
                            if (!relevantChanges.has(patternName)) {
                                relevantChanges.set(patternName, new Set());
                            }
                            relevantChanges.get(patternName).add({
                                element: node,
                                action: 'removed',
                            });
                        });
                    }
                });
            }

            // Handle attribute changes
            if (mutation.type === 'attributes') {
                const patterns = this.getMatchingPatterns(mutation.target);
                if (patterns.length > 0) {
                    patterns.forEach((patternName) => {
                        if (!relevantChanges.has(patternName)) {
                            relevantChanges.set(patternName, new Set());
                        }
                        relevantChanges.get(patternName).add({
                            element: mutation.target,
                            action: 'modified',
                            attribute: mutation.attributeName,
                        });
                    });
                }
            }
        }

        // Debounce and fire callbacks
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
                    if (
                        element.matches?.(selector) ||
                        element.querySelector?.(selector)
                    ) {
                        matches.push(patternName);
                        break; // Only add each pattern once per element
                    }
                    // eslint-disable-next-line no-unused-vars
                } catch (error) {
                    // Invalid selector, skip
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

        return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.opacity !== '0' &&
            style.visibility !== 'hidden' &&
            style.display !== 'none'
        );
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
        this.logger.debug?.('Performing initial DOM scan');

        for (const patternName of Object.keys(this.patterns)) {
            const elements = this.getCurrentPatternElements(patternName);
            if (elements.length > 0) {
                const changes = elements.map(({ element }) => ({
                    element,
                    action: 'initial',
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
            eventType: eventType || name,
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
                    this.getCurrentPatternElements(name).length,
                ])
            ),
        };
    }
}

module.exports = { ObsidianDOMObserver };
