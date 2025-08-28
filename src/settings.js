const { PluginSettingTab, Setting } = require('obsidian');
const { LogLevel } = require('./logger');

const DEFAULT_SETTINGS = {
    // Basic functionality
    enabled: true,

    // Button positioning and theming
    buttonSize: '50px',
    bottomOffset: '20px',
    rightOffset: '20px',
    buttonOffset: '20px',
    useThemeColors: true,

    // Search interface positioning
    topSpacer: '30px',

    // Search behavior
    searchPlaceholder: 'Search open tabs...',
    maxResults: 20,
    caseSensitive: false, // New setting for the toggle

    // Debugging
    enableDebugging: false,
    enableFileLogging: false,
    logLevel: LogLevel.INFO,
    autoDowngradeLevelMinutes: 5,

    // Detection settings
    detectionInterval: 200,
    enableDOMObserver: true,

    // UI styling
    buttonOpacity: '0.9',
    overlayOpacity: '0.5',
};

class TabSearchSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const containerEl = this.containerEl;
        containerEl.empty();

        const isMobile = this.app.isMobile;

        containerEl.createEl('h2', { text: 'Tab Search Plugin Settings' });

        // Plugin version info box
        const infoBox = containerEl.createEl('div', {
            cls: 'setting-item-info',
        });
        infoBox.createEl('div', {
            text: `${this.plugin.manifest?.name || 'Tab Search Plugin'} v${this.plugin.manifest?.version || '0.1.0'}`,
        });
        infoBox.createEl('div', {
            text: `Currently running on: ${isMobile ? 'Mobile' : 'Desktop'}`,
        });

        if (!isMobile) {
            const warningEl = infoBox.createEl('div', {
                text: '⚠️ This plugin only functions on mobile devices.',
                cls: 'mod-warning',
            });
            warningEl.style.color = 'var(--text-error)';
            warningEl.style.fontWeight = 'bold';
        }

        infoBox.style.marginBottom = '20px';
        infoBox.style.padding = '10px';
        infoBox.style.backgroundColor = 'var(--background-secondary)';
        infoBox.style.borderRadius = '5px';

        // Basic Settings
        containerEl.createEl('h3', { text: 'Basic Settings' });

        new Setting(containerEl)
            .setName('Enable plugin')
            .setDesc('Enable or disable the tab search functionality')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enabled)
                    .onChange(async (value) => {
                        this.plugin.settings.enabled = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Button Settings
        containerEl.createEl('h3', { text: 'Button Settings' });

        new Setting(containerEl)
            .setName('Use theme colors')
            .setDesc('Automatically match mobile theme colors and positioning')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.useThemeColors)
                    .onChange(async (value) => {
                        this.plugin.settings.useThemeColors = value;
                        await this.plugin.saveSettings();
                        this.display();
                    })
            );

        if (!this.plugin.settings.useThemeColors) {
            const manualGroup = containerEl.createEl('div');
            manualGroup.style.marginLeft = '20px';
            manualGroup.style.paddingLeft = '15px';
            manualGroup.style.borderLeft =
                '3px solid var(--interactive-accent)';
            manualGroup.style.marginTop = '10px';
            manualGroup.style.marginBottom = '15px';

            new Setting(manualGroup)
                .setName('Button size')
                .setDesc('Size of the floating search button')
                .addText((text) =>
                    text
                        .setPlaceholder('50px')
                        .setValue(
                            this.plugin.settings.buttonSize.replace('px', '')
                        )
                        .onChange(async (value) => {
                            this.plugin.settings.buttonSize = value + 'px';
                            await this.plugin.saveSettings();
                        })
                );

            new Setting(manualGroup)
                .setName('Bottom offset')
                .setDesc('Distance from bottom of screen')
                .addText((text) =>
                    text
                        .setPlaceholder('20px')
                        .setValue(
                            this.plugin.settings.bottomOffset.replace('px', '')
                        )
                        .onChange(async (value) => {
                            this.plugin.settings.bottomOffset = value + 'px';
                            await this.plugin.saveSettings();
                        })
                );

            new Setting(manualGroup)
                .setName('Right offset')
                .setDesc('Distance from right of screen')
                .addText((text) =>
                    text
                        .setPlaceholder('20px')
                        .setValue(
                            this.plugin.settings.rightOffset.replace('px', '')
                        )
                        .onChange(async (value) => {
                            this.plugin.settings.rightOffset = value + 'px';
                            await this.plugin.saveSettings();
                        })
                );
        } else {
            new Setting(containerEl)
                .setName('Button offset')
                .setDesc('Distance above the mobile edit/view button')
                .addText((text) =>
                    text
                        .setPlaceholder('20px')
                        .setValue(
                            this.plugin.settings.buttonOffset.replace('px', '')
                        )
                        .onChange(async (value) => {
                            this.plugin.settings.buttonOffset = value + 'px';
                            await this.plugin.saveSettings();
                        })
                );
        }

        new Setting(containerEl)
            .setName('Button opacity')
            .setDesc('Transparency of the button (0.1 to 1.0)')
            .addText((text) =>
                text
                    .setPlaceholder('0.9')
                    .setValue(this.plugin.settings.buttonOpacity)
                    .onChange(async (value) => {
                        const opacity = parseFloat(value);
                        if (opacity >= 0.1 && opacity <= 1.0) {
                            this.plugin.settings.buttonOpacity = value;
                            await this.plugin.saveSettings();
                        }
                    })
            );

        // Search Settings
        containerEl.createEl('h3', { text: 'Search Settings' });

        new Setting(containerEl)
            .setName('Top spacing')
            .setDesc('Distance from top of screen to search interface')
            .addText((text) =>
                text
                    .setPlaceholder('0px')
                    .setValue(this.plugin.settings.topSpacer.replace('px', ''))
                    .onChange(async (value) => {
                        this.plugin.settings.topSpacer = value + 'px';
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Search placeholder')
            .setDesc('Placeholder text for search input')
            .addText((text) =>
                text
                    .setPlaceholder('Search open tabs...')
                    .setValue(this.plugin.settings.searchPlaceholder)
                    .onChange(async (value) => {
                        this.plugin.settings.searchPlaceholder =
                            value || 'Search open tabs...';
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Max results')
            .setDesc('Maximum number of search results to show')
            .addText((text) =>
                text
                    .setPlaceholder('20')
                    .setValue(this.plugin.settings.maxResults.toString())
                    .onChange(async (value) => {
                        const num = parseInt(value);
                        if (num > 0 && num <= 100) {
                            this.plugin.settings.maxResults = num;
                            await this.plugin.saveSettings();
                        }
                    })
            );

        // Debug Settings
        containerEl.createEl('h3', { text: 'Debug Settings' });

        new Setting(containerEl)
            .setName('Enable debugging')
            .setDesc('Enable debug logging to console and/or file')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableDebugging)
                    .onChange(async (value) => {
                        this.plugin.settings.enableDebugging = value;
                        await this.plugin.saveSettings();
                        this.display();
                    })
            );

        if (this.plugin.settings.enableDebugging) {
            new Setting(containerEl)
                .setName('Log level')
                .setDesc('Set the level of detail for logs')
                .addDropdown((dropdown) =>
                    dropdown
                        .addOption(LogLevel.ERROR.toString(), 'Error')
                        .addOption(LogLevel.WARN.toString(), 'Warning')
                        .addOption(LogLevel.INFO.toString(), 'Info')
                        .addOption(LogLevel.VERBOSE.toString(), 'Verbose')
                        .addOption(LogLevel.DEBUG.toString(), 'Debug')
                        .addOption(LogLevel.TRACE.toString(), 'Trace')
                        .setValue(this.plugin.settings.logLevel.toString())
                        .onChange(async (value) => {
                            this.plugin.settings.logLevel = parseInt(value, 10);
                            await this.plugin.saveSettings();
                            this.display();
                        })
                );

            const highLogLevels = [
                LogLevel.VERBOSE,
                LogLevel.DEBUG,
                LogLevel.TRACE,
            ];
            if (highLogLevels.includes(this.plugin.settings.logLevel)) {
                new Setting(containerEl)
                    .setName('Auto downgrade log level')
                    .setDesc(
                        'Automatically reset log level to "Info" after a set time (minutes). Set to 0 to disable.'
                    )
                    .addText((text) =>
                        text
                            .setValue(
                                this.plugin.settings.autoDowngradeLevelMinutes.toString()
                            )
                            .onChange(async (value) => {
                                this.plugin.settings.autoDowngradeLevelMinutes =
                                    parseInt(value, 10) || 0;
                                await this.plugin.saveSettings();
                            })
                    );
            }

            new Setting(containerEl)
                .setName('Enable file logging')
                .setDesc(
                    'Also write log messages to a file in the plugin directory'
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(this.plugin.settings.enableFileLogging)
                        .onChange(async (value) => {
                            this.plugin.settings.enableFileLogging = value;
                            await this.plugin.saveSettings();
                        })
                );

            const debugInfo = containerEl.createEl('div', {
                cls: 'setting-item-info',
            });
            debugInfo.innerHTML = `
                <strong>Debug log location:</strong><br>
                <code>.obsidian/plugins/tab-search-mobile/debug.log</code>
            `;
            debugInfo.style.marginTop = '10px';
            debugInfo.style.padding = '10px';
            debugInfo.style.backgroundColor = 'var(--background-secondary)';
            debugInfo.style.borderRadius = '5px';
            debugInfo.style.fontSize = '12px';
        }

        // Debug info section (mobile only)
        if (isMobile && this.plugin.tabSearchManager) {
            // Replaced collapsible section with a standard heading
            containerEl.createEl('h3', { text: 'Debug Info' });

            const debugContent = containerEl.createEl('div');
            debugContent.style.padding = '10px';
            debugContent.style.backgroundColor = 'var(--background-secondary)';
            debugContent.style.borderRadius = '5px';
            debugContent.style.fontFamily = 'monospace';
            debugContent.style.fontSize = '11px';

            const debugInfo = this.plugin.tabSearchManager.getDebugInfo();
            debugContent.innerHTML = `
                <strong>Plugin Status:</strong><br>
                • Tab View Open: ${debugInfo.isTabViewOpen ? 'YES' : 'NO'}<br>
                • Search Active: ${debugInfo.isSearchActive ? 'YES' : 'NO'}<br>
                • Last Update: ${debugInfo.timestamp}<br><br>
                
                <strong>Detection Info:</strong><br>
                • Method: ${debugInfo.detectorInfo?.detectionMethod || 'Unknown'}<br>
                • Last Check: ${debugInfo.detectorInfo?.lastCheck || 'Never'}<br>
                • Indicators: ${debugInfo.detectorInfo?.tabViewIndicators?.length || 0}<br><br>
                
                <strong>Interface Info:</strong><br>
                • Button Visible: ${debugInfo.interfaceInfo?.buttonVisible ? 'YES' : 'NO'}<br>
                • Search Visible: ${debugInfo.interfaceInfo?.searchVisible ? 'YES' : 'NO'}<br>
                • Button Position: ${debugInfo.interfaceInfo?.buttonPosition || 'Unknown'}<br><br>
                
                <strong>Tab Info:</strong><br>
                • Open Tabs: ${debugInfo.tabInfo?.lastTabCount || 0}<br>
                • Last Navigation: ${debugInfo.tabInfo?.lastNavigation?.tabName || 'None'}<br>
                • Workspace Leaves: ${debugInfo.tabInfo?.workspace?.totalLeaves || 0}
            `;

            const refreshBtn = debugContent.createEl('button', {
                text: 'Refresh Debug Info',
            });
            refreshBtn.style.marginTop = '10px';
            refreshBtn.onclick = () => this.display();
        }
    }
}

module.exports = { TabSearchSettingTab, DEFAULT_SETTINGS };
