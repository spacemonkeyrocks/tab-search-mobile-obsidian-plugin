class MobileUtils {
    constructor(plugin) {
        this.plugin = plugin;
    }

    async findMobileButtonElement() {
        this.plugin.logger.logDebug(
            'Attempting to find mobile button element...'
        );

        const selectors = [
            '.view-actions .view-action[aria-label*="Current view"]', // Target the specific button
            '.view-actions .view-action',
            '.floating-action-btn',
            '.mod-cta .clickable-icon',
        ];

        const maxAttempts = 10;
        const intervalTime = 50;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            for (const selector of selectors) {
                this.plugin.logger.logTrace(`Checking selector "${selector}"`);
                const elements = document.querySelectorAll(selector);

                for (const element of elements) {
                    const rect = element.getBoundingClientRect();

                    // Check for actual rendered button (not zero-size duplicates)
                    if (rect.width > 0 && rect.height > 0) {
                        // Ensure it's in the bottom area of screen (floating button)
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
            'No mobile button found with any valid selector.'
        );
        return null;
    }

    async getMobileThemeProperties() {
        this.plugin.logger.logDebug('Get mobile theme properties');

        if (
            this.plugin.app.isMobile &&
            this.plugin.settings?.useThemeColors !== false
        ) {
            const element = await this.findMobileButtonElement();
            if (element) {
                const style = getComputedStyle(element);

                // Get button color
                const buttonColor = [
                    style.backgroundColor,
                    style.getPropertyValue('--interactive-accent'),
                    style.getPropertyValue('--color-accent'),
                ].find(
                    (c) =>
                        c &&
                        c !== 'rgba(0, 0, 0, 0)' &&
                        c !== 'transparent' &&
                        c.trim() !== ''
                );

                // Get text color
                const textColor = [
                    style.color,
                    style.getPropertyValue('--text-on-accent'),
                    style.getPropertyValue('--text-normal'),
                    '#ffffff',
                ].find((c) => c && c.trim() !== '');

                // Get opacity
                const buttonOpacity = style.opacity || '1';

                if (buttonColor) {
                    this.plugin.logger.logVerbose(
                        `Found theme properties: bg=${buttonColor}, text=${textColor}, opacity=${buttonOpacity}`
                    );
                    return { buttonColor, textColor, buttonOpacity };
                }
            }
        }

        // Fallback to default theme colors
        return {
            buttonColor: 'var(--interactive-accent, #007acc)',
            textColor: 'var(--text-on-accent, #ffffff)',
            buttonOpacity: '0.9',
        };
    }

    async detectMobileButtonPosition() {
        this.plugin.logger.logDebug('Detect mobile button position');

        if (this.plugin.app.isMobile) {
            const mobileButton = await this.findMobileButtonElement();
            if (mobileButton) {
                const rect = mobileButton.getBoundingClientRect();
                const buttonSize =
                    Math.round(Math.max(rect.width, rect.height)) + 'px';

                // Position at EXACTLY the same location, not above it
                const bottomPos = window.innerHeight - rect.bottom + 'px';
                const rightPos = window.innerWidth - rect.right + 'px';

                const detectionInfo = {
                    selector: mobileButton.className,
                    originalRect: `${rect.left}, ${rect.top}, ${rect.width}x${rect.height}`,
                    calculatedPosition: `${rightPos} from right, ${bottomPos} from bottom`,
                    detectedSize: buttonSize,
                    method: 'exact-position',
                };

                this.plugin.logger.logDebug(
                    `Mobile button positioned exactly: ${detectionInfo.calculatedPosition}`
                );

                return {
                    bottom: bottomPos,
                    right: rightPos,
                    size: buttonSize,
                    detectionInfo,
                };
            }
        }

        // Fallback positioning
        return {
            bottom: this.plugin.settings?.bottomOffset || '120px',
            right: this.plugin.settings?.rightOffset || '20px',
            size: this.plugin.settings?.buttonSize || '50px',
            detectionInfo: {
                method: 'fallback',
                reason: 'Could not detect mobile button',
            },
        };
    }

    getDebugInfo() {
        return {
            isMobile: this.plugin.app.isMobile,
            timestamp: new Date().toLocaleTimeString(),
        };
    }
}

module.exports = { MobileUtils };
