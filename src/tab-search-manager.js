const { MobileTabDetector } = require('./mobile-tab-detector');
const { SearchInterface } = require('./search-interface');
const { TabManager } = require('./tab-manager');

class TabSearchManager {
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
            'TabSearchManager: Starting initialization with event-based detection'
        );

        try {
            // Initialize detection system
            await this.mobileDetector.initialize();

            // Register for state change events (no more polling!)
            this.mobileDetector.onStateChange((isOpen) => {
                this.handleTabViewStateChange(isOpen);
            });

            this.plugin.logger.logVerbose(
                'TabSearchManager: Initialization complete'
            );
        } catch (error) {
            this.plugin.logger.logError(
                `TabSearchManager initialization failed: ${error.message}`
            );
        }
    }

    handleTabViewStateChange(isOpen) {
        this.plugin.logger.logVerbose(
            `Tab view state changed via event: ${this.isTabViewOpen ? 'OPEN' : 'CLOSED'} -> ${isOpen ? 'OPEN' : 'CLOSED'}`
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
            'Tab view opened - showing search button'
        );

        try {
            this.searchInterface.showFloatingButton(() =>
                this.handleSearchButtonClick()
            );
        } catch (error) {
            this.plugin.logger.logError(
                `Failed to show search button: ${error.message}`
            );
        }
    }

    handleTabViewClosed() {
        this.plugin.logger.logVerbose(
            'Tab view closed - cleaning up interface'
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
        this.plugin.logger.logVerbose('Search button clicked');

        if (this.isSearchActive) {
            // Close search if already open
            this.searchInterface.hideSearchInterface();
            this.isSearchActive = false;
        } else {
            // Open search interface
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

            // Close search interface
            this.searchInterface.hideSearchInterface();
            this.isSearchActive = false;
        } catch (error) {
            this.plugin.logger.logError(
                `Failed to navigate to tab: ${error.message}`
            );
        }
    }

    handleSearchClosed() {
        this.plugin.logger.logTrace('Search interface closed by user');
        this.isSearchActive = false;
    }

    handleWorkspaceChange() {
        // With event-based detection, we don't need to manually check state changes
        // The DOM observer will automatically detect and notify us of changes
        this.plugin.logger.logTrace(
            'Workspace changed - event-based detection will handle state changes automatically'
        );
    }

    handleSettingsChange() {
        this.plugin.logger.logDebug('Settings changed - updating components');

        // Update search interface styling/positioning
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
            timestamp: new Date().toLocaleTimeString(),
        };
    }

    cleanup() {
        this.plugin.logger.logVerbose('TabSearchManager: Starting cleanup');

        // Clean up detector callbacks
        if (this.mobileDetector) {
            this.mobileDetector.cleanup();
        }

        // Run cleanup callbacks
        this.cleanupCallbacks.forEach((callback) => {
            try {
                callback();
            } catch (error) {
                this.plugin.logger.logWarn(
                    `Cleanup callback failed: ${error.message}`
                );
            }
        });

        // Clean up UI
        if (this.searchInterface) {
            this.searchInterface.cleanup();
        }

        this.cleanupCallbacks = [];
        this.isTabViewOpen = false;
        this.isSearchActive = false;

        this.plugin.logger.logVerbose('TabSearchManager: Cleanup complete');
    }
}

module.exports = { TabSearchManager };
