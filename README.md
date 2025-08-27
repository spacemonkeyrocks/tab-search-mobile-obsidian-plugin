# Tab Search (Mobile) - Obsidian Plugin

Search and navigate between open tabs on Obsidian Mobile with a floating search button and intuitive interface.

## Features

- **Mobile-Only Design**: Exclusively designed for mobile devices - optimizes the mobile Obsidian experience
- **Smart Tab Detection**: Automatically detects when mobile tab view is open and shows/hides search button accordingly
- **Floating Search Button**: Appears exactly where the native edit/view toggle button is positioned
- **Top-Positioned Search**: Search interface appears at the top of the screen for easy thumb access
- **Real-Time Search**: Filter tabs as you type with highlighted matching text
- **Keyboard Navigation**: Use arrow keys, Enter, and Escape for efficient navigation
- **Theme Integration**: Automatically adapts to your mobile theme colors and styling
- **Touch-Optimized**: Large touch targets and mobile-friendly interactions

## How It Works

1. **Open Tab View**: When you open the mobile tab switcher, a floating search button appears
2. **Start Searching**: Tap the search button to open the search interface at the top of your screen  
3. **Find Your Tab**: Type to filter tabs by name with real-time highlighting
4. **Navigate**: Tap a result or use keyboard navigation (arrows + Enter) to switch tabs
5. **Auto-Close**: Search interface automatically closes when you select a tab or close the tab view

## Installation

### From Obsidian Community Plugins
1. Open Obsidian Settings
2. Go to Community Plugins and turn off Safe Mode
3. Click Browse and search for "Tab Search Mobile"
4. Install and enable the plugin

### Manual Installation
1. Download the latest release from GitHub
2. Extract the files to your vault's `.obsidian/plugins/tab-search-mobile/` folder
3. Reload Obsidian and enable the plugin in Community Plugins

## Settings

### Button Settings
- **Use theme colors**: Automatically match mobile theme colors and positioning
- **Manual positioning**: Size, position, and color controls (when auto-positioning is disabled)

### Search Settings  
- **Top spacing**: Distance from top of screen to search interface (default: 30px)
- **Search placeholder**: Customize the search input placeholder text
- **Max results**: Limit the number of search results displayed

### Debug Settings
- **Enable debugging**: Turn on detailed logging for troubleshooting
- **Log level**: Control the verbosity of debug information (Error to Trace)
- **File logging**: Write debug logs to file for analysis
- **Live debug info**: Real-time plugin status information (mobile only)

## Requirements

- **Obsidian Mobile**: This plugin only works on mobile devices (Android/iOS)
- **Minimum Obsidian Version**: 0.15.0 or higher

## Platform Support

| Platform | Support |
|----------|---------|
| Android Mobile | ✅ Full Support |
| iOS Mobile | ✅ Full Support |
| Desktop | ❌ Not Supported |
| Tablet | ⚠️ May Work* |

*Tablet support depends on whether Obsidian runs in mobile mode on your device.

## Troubleshooting

### Common Issues

**Search button doesn't appear:**
- Ensure you're on a mobile device (plugin is mobile-only)
- Check that tab view is actually open (try opening/closing tabs)
- Enable debug logging to see detection status

**Search not finding tabs:**
- Verify tabs are actually open (not just recent files)
- Check if tab titles match what you're typing
- Try searching for partial names or different parts of the title

**Button positioned incorrectly:**
- Try toggling "Use theme colors" setting off and on
- Manually adjust positioning in settings if auto-detection fails
- Check debug info for positioning calculations

### Debug Information

Enable debugging in plugin settings to get detailed information:
- Tab detection events and success rates
- Button positioning calculations  
- Search interface state changes
- Mobile theme detection results

The debug logs are written to: `.obsidian/plugins/tab-search-mobile/debug.log`

## Development

This plugin is built with a modular architecture for maintainability:

- **Event-driven detection**: Uses DOM mutation observers instead of polling
- **Mobile-first design**: All components optimized for touch interfaces  
- **Defensive programming**: Multiple fallback strategies for reliability
- **Comprehensive debugging**: Extensive logging for troubleshooting mobile issues

See [DEVELOPER.md](DEVELOPER.md) for setup instructions and [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Privacy

This plugin:
- Runs entirely locally on your device
- Does not collect or transmit any data
- Only accesses your open tabs for search functionality
- Does not modify your notes or vault contents

## License

[MIT License](LICENSE) - See LICENSE file for details.

## Support

- **Issues**: Report bugs and request features on [GitHub Issues](https://github.com/spacemonkeyrocks/tab-search-mobile-obsidian-plugin/issues)
- **Discussions**: Ask questions and share feedback in [GitHub Discussions](https://github.com/spacemonkeyrocks/tab-search-mobile-obsidian-plugin/discussions)

## Acknowledgments

Built with inspiration from mobile UX patterns and the Obsidian mobile community's needs for better tab navigation.

---

**Note**: This plugin is not affiliated with Obsidian. It is a community-developed plugin designed to enhance the mobile Obsidian experience.