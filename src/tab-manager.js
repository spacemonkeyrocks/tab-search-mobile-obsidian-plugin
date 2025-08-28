class TabManager {
    constructor(plugin) {
        this.plugin = plugin;
        this.debugInfo = {
            lastTabCount: 0,
            lastNavigation: null,
            workspaceState: null,
        };
    }

    getOpenTabs() {
        this.plugin.logger.logDebug(
            'Getting open tabs from mobile tab structure and workspace'
        );

        try {
            const tabs = [];

            // Strategy 1: Get tabs from mobile DOM elements
            const mobileTabs = document.querySelectorAll('.mobile-tab');
            this.plugin.logger.logDebug(
                `Found ${mobileTabs.length} .mobile-tab elements`
            );

            mobileTabs.forEach((tabElement, index) => {
                const titleElement =
                    tabElement.querySelector('.mobile-tab-title');
                if (titleElement) {
                    const displayName = titleElement.textContent.trim();
                    if (displayName) {
                        tabs.push({
                            leaf: null,
                            file: null,
                            displayName: displayName,
                            path: '',
                            id: `mobile-tab-${index}`,
                            element: tabElement,
                            source: 'mobile-dom',
                        });
                    }
                }
            });

            // Strategy 2: Get tabs from workspace API
            const workspace = this.plugin.app.workspace;
            if (workspace) {
                const allLeaves = workspace.getLeavesOfType();
                this.plugin.logger.logDebug(
                    `Found ${allLeaves.length} workspace leaves`
                );

                // eslint-disable-next-line no-unused-vars
                allLeaves.forEach((leaf, index) => {
                    if (!leaf.view) return;

                    let displayName = '';
                    let filePath = '';
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

                    const matchingMobileTab = tabs.find((tab) =>
                        this.tabTitlesMatch(tab.displayName, displayName)
                    );

                    if (matchingMobileTab) {
                        matchingMobileTab.leaf = leaf;
                        matchingMobileTab.file = leaf.view.file || null;
                        matchingMobileTab.path = filePath;
                        matchingMobileTab.id = leaf.id;
                        matchingMobileTab.source = 'matched';
                        if (!isFileView) {
                            matchingMobileTab.viewType =
                                leaf.view.getViewType();
                        }
                    } else {
                        tabs.push({
                            leaf: leaf,
                            file: leaf.view.file || null,
                            displayName: displayName,
                            path: filePath,
                            id: leaf.id,
                            element: null,
                            viewType: isFileView
                                ? undefined
                                : leaf.view.getViewType(),
                            source: 'workspace-only',
                        });
                    }
                });
            }

            // Remove duplicates
            const uniqueTabs = [];
            const seenNames = new Set();

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
                originalCount: tabs.length,
            };

            this.plugin.logger.logDebug(
                `Total tabs: ${tabs.length}, unique: ${uniqueTabs.length}`
            );

            uniqueTabs.forEach((tab, index) => {
                this.plugin.logger.logTrace(
                    `Tab ${index}: "${tab.displayName}" (${tab.source}) ${tab.element ? 'has-element' : 'no-element'}`
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
            case 'graph':
                return 'Graph View';
            case 'file-explorer':
                return 'File Explorer';
            case 'search':
                return 'Search';
            case 'starred':
                return 'Starred';
            case 'tag':
                return 'Tags';
            case 'outline':
                return 'Outline';
            case 'backlink':
                return 'Backlinks';
            case 'calendar':
                return 'Calendar';
            case 'kanban':
                return 'Kanban Board';
            case 'canvas': {
                const file = leaf.view?.file;
                return file ? file.basename : 'Canvas';
            }
            case 'pdf': {
                const pdfFile = leaf.view?.file;
                return pdfFile ? pdfFile.basename : 'PDF';
            }
            case 'image': {
                const imageFile = leaf.view?.file;
                return imageFile ? imageFile.basename : 'Image';
            }
            case 'audio': {
                const audioFile = leaf.view?.file;
                return audioFile ? audioFile.basename : 'Audio';
            }
            case 'video': {
                const videoFile = leaf.view?.file;
                return videoFile ? videoFile.basename : 'Video';
            }
            default: {
                if (
                    leaf.view &&
                    typeof leaf.view.getDisplayText === 'function'
                ) {
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
                    'Attempting mobile tab element click'
                );

                tab.element.click();

                const clickableChildren = tab.element.querySelectorAll(
                    '[tabindex], button, .clickable'
                );
                if (clickableChildren.length > 0) {
                    this.plugin.logger.logTrace(
                        `Found ${clickableChildren.length} clickable child elements`
                    );
                    clickableChildren[0].click();
                }

                this.debugInfo.lastNavigation = {
                    tabName: tab.displayName,
                    method: 'mobile-element-click',
                    elementClass: tab.element.className,
                    timestamp: new Date().toLocaleTimeString(),
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
                    method: 'workspace-api',
                    leafId: tab.leaf.id,
                    timestamp: new Date().toLocaleTimeString(),
                };

                this.plugin.logger.logVerbose(
                    `Workspace navigation successful: ${tab.displayName}`
                );
                return true;
            }

            this.plugin.logger.logDebug(
                'Attempting to find mobile tab by title text'
            );
            const allMobileTabs = document.querySelectorAll('.mobile-tab');

            for (const mobileTab of allMobileTabs) {
                const titleElement =
                    mobileTab.querySelector('.mobile-tab-title');
                if (
                    titleElement &&
                    titleElement.textContent.trim() === tab.displayName
                ) {
                    this.plugin.logger.logDebug(
                        `Found matching mobile tab by title: ${tab.displayName}`
                    );
                    mobileTab.click();

                    this.debugInfo.lastNavigation = {
                        tabName: tab.displayName,
                        method: 'title-search-click',
                        timestamp: new Date().toLocaleTimeString(),
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
            (tab) =>
                tab.displayName.toLowerCase().includes(searchQuery) ||
                tab.path.toLowerCase().includes(searchQuery)
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
                    displayText: leaf.view?.getDisplayText?.() || 'N/A',
                })),
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    getDebugInfo() {
        return {
            ...this.debugInfo,
            workspace: this.getWorkspaceDebugInfo(),
        };
    }
}

module.exports = { TabManager };
