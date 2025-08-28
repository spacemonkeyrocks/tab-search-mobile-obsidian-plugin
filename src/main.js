const { Plugin } = require('obsidian');
const { TabSearchManager } = require('./tab-search-manager');
const { TabSearchSettingTab, DEFAULT_SETTINGS } = require('./settings');
const { Logger, LogLevel } = require('./logger');

class TabSearchPlugin extends Plugin {
    logDowngradeTimer = null;

    async onload() {
        try {
            // Initialize logger first
            this.logger = new Logger(this);
            
            // Load settings BEFORE first log message
            await this.loadSettings();
            
            // Early exit for non-mobile platforms with error
            if (!this.app.isMobile) {
                this.logger.logError("Tab Search Plugin: This plugin is designed exclusively for mobile devices and will not function on desktop.", true, 'console');
                
                // Show error notice to user
                const { Notice } = require('obsidian');
                new Notice("Tab Search Plugin: This plugin only works on mobile devices.", 8000);
                
                // Disable the plugin completely by setting a flag and returning
                this.disabled = true;
                return;
            }
            
            this.logger.logInfo("Loading Tab Search Plugin (Mobile)", true, 'console');
            
            // Initialize components
            this.tabSearchManager = new TabSearchManager(this);
            
            // Add settings tab
            this.addSettingTab(new TabSearchSettingTab(this.app, this));
            
            this.logger.logDebug("Settings loaded and tab added successfully");

            // Wait for workspace to be ready
            this.app.workspace.onLayoutReady(() => {
                this.logger.logVerbose("Workspace layout ready. Starting tab detection.");
                this.tabSearchManager.initialize();
            });

            // Monitor workspace changes
            this.registerEvent(
                this.app.workspace.on('active-leaf-change', () => {
                    this.logger.logTrace("Active leaf changed - checking tab view state");
                    this.tabSearchManager.handleWorkspaceChange();
                })
            );

            // Start log downgrade timer
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
        const shouldDowngrade = this.settings.autoDowngradeLevelMinutes > 0 && 
                                highLogLevels.includes(this.settings.logLevel);

        if (shouldDowngrade) {
            const delayInMs = this.settings.autoDowngradeLevelMinutes * 60 * 1000;
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
        if (this.disabled) return; // Don't save settings if plugin is disabled
        
        this.logger.logDebug("Saving settings");
        await this.saveData(this.settings);
        
        // Reinitialize manager with new settings
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
}

module.exports = TabSearchPlugin;