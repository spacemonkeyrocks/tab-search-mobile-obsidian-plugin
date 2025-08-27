#!/bin/bash
#
# This script installs, links, deletes, or checks the status of the plugin.
# It dynamically reads the plugin ID from manifest.json.
#
# Modes:
# --install : Copies the files into the vault.
# --link    : Creates symbolic links for instant updates.
# --delete  : Removes the plugin from the vault with confirmation.
# --status  : Checks if the plugin is installed and reports the method.
# --vault   : Specifies the path to your Obsidian vault.

# --- Configuration ---
FILES_TO_PROCESS=("main.js" "manifest.json" "styles.css")

# --- Functions ---
function print_error() {
    echo "❌ Error: $1" >&2
    exit 1
}

function print_success() {
    echo "✅ Success: $1"
}

function display_help() {
    echo "Obsidian Plugin Installer"
    echo "Installs, symlinks, deletes, or checks the status of the plugin in your test vault."
    echo
    echo "Usage: $0 <mode> [options]"
    echo
    echo "Modes:"
    echo "  --install         Copy files for installation."
    echo "  --link            Use symbolic links for installation (recommended for development)."
    echo "  --status          Check the current installation status."
    echo "  --delete          Remove the plugin from the vault."
    echo
    echo "Options:"
    echo "  --vault <path>    Specify the absolute path to your Obsidian vault."
    echo "  --help            Display this help message."
    echo
    echo "Note: The vault path can also be provided via the OBSIDIAN_VAULT environment variable or a .env file."
}

# --- Script Logic ---

# 1. Parse Arguments
MODE=""
VAULT_PATH=""

if [ "$#" -eq 0 ]; then
    display_help
    exit 1
fi

while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --vault)
      VAULT_PATH="$2"
      shift 2
      ;;
    --link|--install|--status|--delete)
      if [ -n "$MODE" ]; then
        print_error "Only one mode (--install, --link, --status, or --delete) can be specified."
      fi
      MODE="${key#--}" # Removes the "--" prefix
      shift
      ;;
    --help)
      display_help
      exit 0
      ;;
    *)
      print_error "Unknown option: $1"
      ;;
  esac
done

# 2. Validate Mode and Source Files
if [ -z "$MODE" ]; then
    echo "❌ Error: You must specify an operation mode (--install, --link, --status, or --delete)."
    echo
    display_help
    exit 1
fi

# For install/link modes, verify source files exist first
if [ "$MODE" = "install" ] || [ "$MODE" = "link" ]; then
    echo "ℹ️ Verifying source files..."
    for file in "${FILES_TO_PROCESS[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "Required source file '$file' not found. Did you run 'npm run build'?"
        fi
    done
    echo "✅ Source files verified."
fi

echo "ℹ️ Operation mode: $MODE"

# 3. Determine Vault Path
if [ -z "$VAULT_PATH" ]; then
    # ... (code for OBSIDIAN_VAULT and .env is unchanged)
    if [ -n "$OBSIDIAN_VAULT" ]; then
        VAULT_PATH="$OBSIDIAN_VAULT"
        echo "ℹ️ Using vault path from OBSIDIAN_VAULT environment variable."
    elif [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
        if [ -n "$OBSIDIAN_VAULT" ]; then
            VAULT_PATH="$OBSIDIAN_VAULT"
            echo "ℹ️ Using vault path from .env file."
        fi
    fi
fi

# 4. Validate Vault Path
if [ -z "$VAULT_PATH" ]; then
    print_error "Obsidian vault path not specified. Use the --vault flag or set OBSIDIAN_VAULT."
fi
if [ ! -d "$VAULT_PATH/.obsidian/plugins" ]; then
    print_error "The plugins directory does not exist in the provided vault path: $VAULT_PATH"
fi

# 5. Get Plugin ID
if [ ! -f "manifest.json" ]; then
    print_error "manifest.json not found in the current directory. Cannot determine plugin ID."
fi
PLUGIN_ID=$(grep '"id":' manifest.json | sed 's/.*: *"\([^"]*\)".*/\1/')
if [ -z "$PLUGIN_ID" ]; then
    print_error "Could not extract plugin ID from manifest.json."
fi
echo "ℹ️ Detected Plugin ID: $PLUGIN_ID"


# 6. Define Destination
DEST_DIR="$VAULT_PATH/.obsidian/plugins/$PLUGIN_ID/"
SOURCE_DIR=$(pwd)

# 7. Handle Terminating Modes (--status, --delete)
if [ "$MODE" = "status" ]; then
    # ... (status logic is unchanged)
    echo "🔎 Checking status in: $DEST_DIR"
    if [ ! -d "$DEST_DIR" ] && [ ! -L "$DEST_DIR" ]; then
        echo "Status: Plugin is not installed."
        exit 0
    fi
    if [ -L "$DEST_DIR/${FILES_TO_PROCESS[0]}" ]; then
        echo "Status: Plugin is installed via ✨ link ✨."
    elif [ -f "$DEST_DIR/${FILES_TO_PROCESS[0]}" ]; then
        echo "Status: Plugin is installed via 📋 copy 📋."
    else
        echo "Status: Plugin directory exists but appears to be empty or corrupted."
    fi
    exit 0
fi

if [ "$MODE" = "delete" ]; then
    # ... (delete logic is unchanged)
    echo "🗑️  Attempting to delete plugin from: $DEST_DIR"
    if [ ! -d "$DEST_DIR" ] && [ ! -L "$DEST_DIR" ]; then
        echo "Status: Plugin is not installed. Nothing to delete."
        exit 0
    fi
    read -p "⚠️  Are you sure you want to permanently delete this plugin folder? (y/N) " -n 1 -r
    echo
    if [[ "$REPLY" =~ ^[Yy]$ ]]; then
        rm -rf "$DEST_DIR"
        print_success "Plugin successfully deleted."
    else
        echo "Aborted by user."
    fi
    exit 0
fi

# 8. Handle --install or --link modes
if [ -d "$DEST_DIR" ] || [ -L "$DEST_DIR" ]; then
    EXISTING_MODE=""
    if [ -L "$DEST_DIR/${FILES_TO_PROCESS[0]}" ]; then
        EXISTING_MODE="link"
    elif [ -f "$DEST_DIR/${FILES_TO_PROCESS[0]}" ]; then
        EXISTING_MODE="install"
    fi
    if [ -n "$EXISTING_MODE" ] && [ "$EXISTING_MODE" != "$MODE" ]; then
        read -p "⚠️ You are switching from '$EXISTING_MODE' mode to '$MODE' mode. This will replace the existing plugin folder. Are you sure? (y/N) " -n 1 -r
        echo
        if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
            echo "Aborted by user."
            exit 0
        fi
    fi
fi

echo "ℹ️ Preparing to $MODE plugin '$PLUGIN_ID' to: $DEST_DIR"
rm -rf "$DEST_DIR"
mkdir -p "$DEST_DIR" || print_error "Could not create destination directory."

for file in "${FILES_TO_PROCESS[@]}"; do
    # The check for file existence is now done at the start, so this loop is simpler.
    if [ "$MODE" = "link" ]; then
        ln -s "$SOURCE_DIR/$file" "$DEST_DIR/$file" || print_error "Failed to create symlink for $file."
        echo "  🔗 Linked $file"
    else
        cp "$file" "$DEST_DIR/$file" || print_error "Failed to copy $file."
        echo "  📋 Copied $file"
    fi
done

print_success "Plugin operation successful. Run 'npm run watch' and reload Obsidian to see changes."