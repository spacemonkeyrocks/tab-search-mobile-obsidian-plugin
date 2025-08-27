class SearchInterface {
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
            lastUpdate: null,
        };
    }

    async showFloatingButton(onClickCallback) {
        this.plugin.logger.logInfo('Showing floating search button');

        this.hideFloatingButton();

        try {
            this.floatingButton = document.createElement('button');
            this.floatingButton.className = 'tab-search-floating-btn';
            this.floatingButton.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 21L16.5 16.5M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            this.floatingButton.title = 'Search Open Tabs';

            await this.positionButton();
            this.styleButton();

            this.floatingButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.plugin.logger.logDebug('Floating button clicked');
                onClickCallback();
            });

            document.body.appendChild(this.floatingButton);

            setTimeout(() => {
                if (this.floatingButton) {
                    this.floatingButton.style.opacity = '0.9';
                    this.floatingButton.style.visibility = 'visible';
                }
            }, 50);

            this.debugInfo.buttonVisible = true;
            this.debugInfo.lastUpdate = new Date().toLocaleTimeString();

            this.plugin.logger.logVerbose(
                'Floating button displayed successfully'
            );
        } catch (error) {
            this.plugin.logger.logError(
                `Failed to show floating button: ${error.message}`
            );
        }
    }

    async positionButton() {
        const { MobileUtils } = require('./mobile-utils');
        const mobileUtils = new MobileUtils(this.plugin);
        const positioning = await mobileUtils.detectMobileButtonPosition();

        if (positioning) {
            Object.assign(this.floatingButton.style, {
                bottom: positioning.bottom,
                right: positioning.right,
                width: positioning.size,
                height: positioning.size,
            });

            this.debugInfo.buttonPosition = `${positioning.right} from right, ${positioning.bottom} from bottom (${positioning.detectionInfo?.method || 'detected'})`;
            this.plugin.logger.logDebug(
                `Button positioned: ${this.debugInfo.buttonPosition}`
            );
        }
    }

    async styleButton() {
        const { MobileUtils } = require('./mobile-utils');
        const mobileUtils = new MobileUtils(this.plugin);
        const themeProps = await mobileUtils.getMobileThemeProperties();

        Object.assign(this.floatingButton.style, {
            position: 'fixed',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: themeProps.buttonColor,
            color: themeProps.textColor,
            cursor: 'pointer',
            opacity: '0',
            visibility: 'hidden',
            transition:
                'opacity 0.3s ease, visibility 0.3s ease, transform 0.2s ease',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '1001',
            fontSize: '0',
        });

        const svg = this.floatingButton.querySelector('svg');
        if (svg) {
            svg.style.setProperty('width', '28px', 'important');
            svg.style.setProperty('height', '28px', 'important');
        }

        this.floatingButton.addEventListener('mouseenter', () => {
            this.floatingButton.style.transform = 'scale(1.1)';
            this.floatingButton.style.boxShadow =
                '0 6px 16px rgba(0, 0, 0, 0.4)';
        });

        this.floatingButton.addEventListener('mouseleave', () => {
            this.floatingButton.style.transform = 'scale(1)';
            this.floatingButton.style.boxShadow =
                '0 4px 12px rgba(0, 0, 0, 0.3)';
        });
    }

    hideFloatingButton() {
        if (this.floatingButton) {
            this.plugin.logger.logDebug('Hiding floating button');
            this.floatingButton.remove();
            this.floatingButton = null;
            this.debugInfo.buttonVisible = false;
            this.debugInfo.lastUpdate = new Date().toLocaleTimeString();
        }
    }

    showSearchInterface(tabs, onTabSelect, onSearchClose) {
        this.plugin.logger.logInfo(
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
            this.debugInfo.lastUpdate = new Date().toLocaleTimeString();
        } catch (error) {
            this.plugin.logger.logError(
                `Failed to show search interface: ${error.message}`
            );
        }
    }

    createSearchOverlay() {
        this.searchOverlay = document.createElement('div');
        this.searchOverlay.className = 'tab-search-overlay';

        Object.assign(this.searchOverlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: '1002',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '0',
        });

        const searchContainer = document.createElement('div');
        searchContainer.className = 'tab-search-container';

        const topSpacer = this.plugin.settings?.topSpacer || '0px';

        Object.assign(searchContainer.style, {
            backgroundColor: 'var(--background-primary)',
            borderRadius: '0 0 12px 12px',
            padding: '20px',
            width: '100%',
            maxWidth: '100%',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            borderTop: 'none',
            marginTop: topSpacer,
        });

        const inputContainer = document.createElement('div');
        inputContainer.className = 'tab-search-input-container';
        Object.assign(inputContainer.style, {
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
        });

        const searchIcon = document.createElement('div');
        searchIcon.className = 'tab-search-icon-left';
        searchIcon.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21L16.5 16.5M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        Object.assign(searchIcon.style, {
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
            zIndex: '1',
        });

        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.placeholder =
            this.plugin.settings?.searchPlaceholder || 'Search open tabs...';
        this.searchInput.className = 'tab-search-input';

        Object.assign(this.searchInput.style, {
            width: '100%',
            padding: '16px 88px 16px 48px', // Increased right padding for two icons
            border: '2px solid var(--background-modifier-border)',
            borderRadius: '12px',
            backgroundColor: 'var(--background-secondary)',
            color: 'var(--text-normal)',
            fontSize: '18px',
            outline: 'none',
            boxSizing: 'border-box',
        });

        // FIX: Create Case-Sensitive Toggle Button
        const caseSensitiveButton = document.createElement('div');
        caseSensitiveButton.className = 'tab-search-case-toggle';
        caseSensitiveButton.textContent = 'Aa';
        caseSensitiveButton.title = 'Toggle Case-Sensitive Search';
        Object.assign(caseSensitiveButton.style, {
            position: 'absolute',
            right: '52px', // Position left of the clear icon
            top: '50%',
            transform: 'translateY(-50%)',
            cursor: 'pointer',
            fontFamily: 'serif',
            fontWeight: 'bold',
            fontSize: '18px',
            transition: 'color 0.2s ease, opacity 0.2s ease',
            zIndex: '1',
        });

        const updateCaseSensitiveButtonState = () => {
            if (this.plugin.settings.caseSensitive) {
                caseSensitiveButton.style.color = 'var(--interactive-accent)';
                caseSensitiveButton.style.opacity = '1';
            } else {
                caseSensitiveButton.style.color = 'var(--text-muted)';
                caseSensitiveButton.style.opacity = '0.6';
            }
        };

        caseSensitiveButton.addEventListener('click', () => {
            this.plugin.settings.caseSensitive =
                !this.plugin.settings.caseSensitive;
            this.plugin.saveSettings();
            updateCaseSensitiveButtonState();
            this.handleSearchInput(this.searchInput.value); // Re-run search
        });

        const clearIcon = document.createElement('div');
        clearIcon.className = 'tab-search-icon-right';
        clearIcon.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="10" cy="10" r="10" fill="var(--text-muted)" opacity="0.6"/>
                <path d="M12.5 7.5L7.5 12.5M7.5 7.5L12.5 12.5" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
        `;
        Object.assign(clearIcon.style, {
            position: 'absolute',
            right: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            opacity: '0',
            transition: 'opacity 0.2s ease',
            zIndex: '1',
        });

        const updateClearIcon = () => {
            if (this.searchInput.value.trim()) {
                clearIcon.style.opacity = '0.7';
            } else {
                clearIcon.style.opacity = '0';
            }
        };

        clearIcon.addEventListener('click', () => {
            this.searchInput.value = '';
            this.handleSearchInput('');
            this.searchInput.focus();
            updateClearIcon();
        });

        clearIcon.addEventListener('mouseenter', () => {
            if (this.searchInput.value.trim()) {
                clearIcon.style.opacity = '1';
            }
        });

        clearIcon.addEventListener('mouseleave', () => {
            if (this.searchInput.value.trim()) {
                clearIcon.style.opacity = '0.7';
            }
        });

        inputContainer.appendChild(searchIcon);
        inputContainer.appendChild(this.searchInput);
        inputContainer.appendChild(caseSensitiveButton); // Add new button
        inputContainer.appendChild(clearIcon);

        this.resultsContainer = document.createElement('div');
        this.resultsContainer.className = 'tab-search-results';

        Object.assign(this.resultsContainer.style, {
            maxHeight: '60vh',
            overflowY: 'auto',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '12px',
            backgroundColor: 'var(--background-secondary)',
        });

        let searchTimeout;
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.handleSearchInput(e.target.value);
            }, 150);
            updateClearIcon();
        });

        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideSearchInterface();
                if (this.onSearchClose) this.onSearchClose();
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                this.handleArrowKeyNavigation(e.key);
                e.preventDefault();
            } else if (e.key === 'Enter') {
                this.handleEnterKey();
                e.preventDefault();
            }
        });

        this.searchOverlay.addEventListener('click', (e) => {
            if (e.target === this.searchOverlay) {
                this.hideSearchInterface();
                if (this.onSearchClose) this.onSearchClose();
            }
        });

        searchContainer.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        searchContainer.appendChild(inputContainer);
        searchContainer.appendChild(this.resultsContainer);
        this.searchOverlay.appendChild(searchContainer);

        document.body.appendChild(this.searchOverlay);

        setTimeout(() => {
            this.searchInput.focus();
            this.plugin.logger.logTrace(
                'Search interface initialized, calling updateSearchResults'
            );
            this.updateSearchResults();
            updateClearIcon();
            updateCaseSensitiveButtonState(); // Set initial state of the button
        }, 100);
    }

    handleSearchInput(query) {
        this.plugin.logger.logTrace(`Search input: "${query}"`);

        if (!query.trim()) {
            this.filteredTabs = [];
        } else {
            // FIX: Implement case-sensitive search logic
            if (this.plugin.settings.caseSensitive) {
                const searchQuery = query.trim();
                this.filteredTabs = this.currentTabs.filter((tab) => {
                    const nameMatch = tab.displayName.includes(searchQuery);
                    const pathMatch =
                        tab.path && tab.path.includes(searchQuery);
                    return nameMatch || pathMatch;
                });
            } else {
                const searchQuery = query.toLowerCase().trim();
                this.filteredTabs = this.currentTabs.filter((tab) => {
                    const nameMatch = tab.displayName
                        .toLowerCase()
                        .includes(searchQuery);
                    const pathMatch =
                        tab.path &&
                        tab.path.toLowerCase().includes(searchQuery);
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
            '.tab-search-result-item'
        );
        if (resultItems.length === 0) return;

        resultItems.forEach((item) => {
            item.style.backgroundColor = 'transparent';
            item.classList.remove('selected');
        });

        if (key === 'ArrowDown') {
            this.selectedIndex = Math.min(
                this.selectedIndex + 1,
                resultItems.length - 1
            );
        } else if (key === 'ArrowUp') {
            this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        }

        if (this.selectedIndex >= 0) {
            const selectedItem = resultItems[this.selectedIndex];
            selectedItem.style.backgroundColor =
                'var(--background-modifier-hover)';
            selectedItem.classList.add('selected');
            selectedItem.scrollIntoView({ block: 'nearest' });
        }
    }

    handleEnterKey() {
        const resultItems = this.resultsContainer.querySelectorAll(
            '.tab-search-result-item'
        );
        if (
            this.selectedIndex >= 0 &&
            this.selectedIndex < resultItems.length
        ) {
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

        this.resultsContainer.innerHTML = '';
        this.selectedIndex = -1;

        const hasQuery =
            this.searchInput && this.searchInput.value.trim() !== '';

        if (this.filteredTabs.length === 0) {
            if (hasQuery) {
                const noResults = document.createElement('div');
                noResults.textContent = 'No matching tabs found';
                Object.assign(noResults.style, {
                    padding: '20px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontStyle: 'italic',
                    fontSize: '16px',
                });
                this.resultsContainer.appendChild(noResults);
            }
            return;
        }

        this.filteredTabs.forEach((tab, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = 'tab-search-result-item';
            resultItem.dataset.index = index;

            Object.assign(resultItem.style, {
                padding: '16px 20px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--background-modifier-border)',
                color: 'var(--text-normal)',
                fontSize: '16px',
                transition: 'background-color 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
            });

            const titleEl = document.createElement('div');
            titleEl.style.fontWeight = '500';

            const query = this.searchInput ? this.searchInput.value.trim() : '';

            if (!query) {
                titleEl.textContent = tab.displayName;
            } else {
                const escapeRegExp = (string) => {
                    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                };

                const escapedQuery = escapeRegExp(query);
                // FIX: Use case-sensitive flag for RegExp based on setting
                const flags = this.plugin.settings.caseSensitive ? 'g' : 'gi';
                const regex = new RegExp(escapedQuery, flags);

                const tempDiv = document.createElement('div');
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

            const subtitleEl = document.createElement('div');
            let subtitleText = '';

            if (tab.viewType) {
                subtitleText = `${tab.viewType} view`;
            }

            if (subtitleText) {
                subtitleEl.textContent = subtitleText;
                subtitleEl.style.fontSize = '14px';
                subtitleEl.style.color = 'var(--text-muted)';
                subtitleEl.style.opacity = '0.8';
                resultItem.appendChild(subtitleEl);
            }

            resultItem.addEventListener('mouseenter', () => {
                if (!resultItem.classList.contains('selected')) {
                    resultItem.style.backgroundColor =
                        'var(--background-modifier-hover)';
                }
                this.selectedIndex = index;
                this.resultsContainer
                    .querySelectorAll('.tab-search-result-item')
                    .forEach((item, i) => {
                        if (i !== index) {
                            item.classList.remove('selected');
                            if (!item.matches(':hover')) {
                                item.style.backgroundColor = 'transparent';
                            }
                        }
                    });
            });

            resultItem.addEventListener('mouseleave', () => {
                if (!resultItem.classList.contains('selected')) {
                    resultItem.style.backgroundColor = 'transparent';
                }
            });

            resultItem.addEventListener('click', () => {
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
            '.tab-search-result-item'
        );
        if (items.length > 0) {
            items[items.length - 1].style.borderBottom = 'none';
        }

        this.plugin.logger.logTrace(
            `Displaying ${this.filteredTabs.length} search results`
        );
    }

    hideSearchInterface() {
        if (this.searchOverlay) {
            this.plugin.logger.logDebug('Hiding search interface');
            this.searchOverlay.remove();
            this.searchOverlay = null;
            this.searchInput = null;
            this.resultsContainer = null;
            this.selectedIndex = -1;
            this.debugInfo.searchVisible = false;
            this.debugInfo.lastUpdate = new Date().toLocaleTimeString();
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
            hasOverlay: !!this.searchOverlay,
        };
    }

    cleanup() {
        this.plugin.logger.logDebug('SearchInterface: Cleaning up');

        this.hideFloatingButton();
        this.hideSearchInterface();

        this.currentTabs = [];
        this.filteredTabs = [];
        this.selectedIndex = -1;
        this.onTabSelect = null;
        this.onSearchClose = null;
    }
}

module.exports = { SearchInterface };
