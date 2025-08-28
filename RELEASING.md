# Release

This guide provides setup instructions using `semantic-release` to release manually and fully automated using GitHub Actions workflow.

## Manual Testing

This section describes how to run a local "dry run" of the release process. This is intended **only for testing your configuration** and verifying what version would be released. The `--dry-run` flag ensures that no changes are pushed and no release is actually published.

**A. Create a GitHub Personal Access Token (PAT)**

To manually execute `semantic-release` you need to create a GitHub Personal Access Token (PAT). Here's how:

1. Go to GitHub `Settings` → `Developer settings` → `Personal access tokens` → `Tokens (classic)`
    - Or use this direct link: https://github.com/settings/tokens
2. Click `Generate new token` → `Generate new token (classic)`
3. Configure the token:
    - Note: Something like "semantic-release for back-to-top-plugin"
    - Expiration: Choose based on your preference (90 days, 1 year, etc.)
    - Scopes: Select these permissions:
        - `repo` (full control of private repositories)
        - `write:packages` (if you plan to publish packages)
4. Click `Generate token` and copy it immediately (you won't see it again)

**B. Set the Token**

For local testing with Docker:

```bash
# Set it as an environment variable (replace with your actual token)
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Or create a .env file in your project root:

```bash
# .env file
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**B. How to manually run it**

```bash
# Always update the container, as it is completely isolated (all files including .git are copied into the container),
# otherwise you will be testing against a stale version
docker compose build --no-cache --progress=plain
# Make sure you have a GITHUB_TOKEN set in an environment variable or in a .env file
docker-compose run --rm release npx semantic-release --dry-run
```

##  GitHub Action Workflow

### The GitHub Action Workflow File

This repository contains a GitHub Action workflow file at [.github/workflows/release.yaml](.github/workflows/release.yaml) that handles the release process. Please refer to that file for the specific steps involved in the automated release.

### Setup Instructions

For the action to have permission to create releases and update files in your repository, you need to configure one thing.

**A. Grant Write Permissions to the Workflow**

The default `GITHUB_TOKEN` that the action uses has read-only permissions. You need to grant it write permissions so it can push changes (like the updated manifest.json and package.json) back to your repository.

1. Go to your GitHub repository.
2. Click on the Settings tab.
3. In the left sidebar, navigate to `Actions` -> `General`.
4. Scroll down to the **"Workflow permissions"** section.
5. Select the **"Read and write permissions"** option.
6. Click Save.

That's it! You do not need to create any new secrets in the "Secrets and variables" section. The `GITHUB_TOKEN` is automatically handled by GitHub.

**B. Ensure `package.json` is Set Up**

This workflow assumes you have a `package.json` file in your repository that lists [semantic-release](https://github.com/semantic-release/semantic-release) and all its plugins as development dependencies, including [semantic-release-obsidian-plugin](https://github.com/brianrodri/semantic-release-obsidian-plugin). If you don't, you can create one by running npm init -y and then install the necessary packages:

```bash
npm install --save-dev semantic-release @semantic-release/commit-analyzer @semantic-release/release-notes-generator @semantic-release/changelog @semantic-release/npm @semantic-release/git @semantic-release/github brianrodri/semantic-release-obsidian-plugin
```

### How to Use It

Now, the process is fully automated.

1. Develop on a Branch: Make your changes, fixes, or add new features on a separate branch (e.g., `feat/new-setting`).
2. Use Conventional Commits: When you commit your changes, make sure your commit messages follow the format described in the [CONTRIBUTING.md](CONTRIBUTING.md) file.
    - `fix: Corrected a bug with mobile positioning`
    - `feat: Added a new setting for button opacity`
    - `docs: Updated the README file` (This will not trigger a release)
3. Create a Pull Request: Open a pull request to merge your branch into main, using the provided [pull request template](PULL_REQUEST_TEMPLATE.md).
4. Merge to main: Once the pull request is merged, the GitHub Action will automatically trigger.

You can watch the progress in the **"Actions"** tab of your GitHub repository. If the commits contain `fix:` or `feat:`, a new release will be created and published automatically.

#### Creating the Pull Request
After you've pushed your branch to GitHub, follow these steps:
1.  **Go to the Repository:** Navigate to the main page of your repository on GitHub.
2.  **Start the Pull Request:** You will usually see a yellow banner prompting you to create a pull request from your recently pushed branch. Click the **"Compare & pull request"** button.
    * If you don't see the banner, click on the **"Pull requests"** tab and then click the **"New pull request"** button.
3.  **Select Branches:** Ensure the base repository's `main` branch is on the left and your feature branch is on the right.
4.  **Fill Out the Template:** GitHub will automatically pre-fill the description with the content from [PULL_REQUEST_TEMPLATE.md](PULL_REQUEST_TEMPLATE.md). Fill out the relevant sections.
5.  **Create the Pull Request:** Click the **"Create pull request"** button.

#### Important Note: The Publishing Process 📝
Creating a release on your GitHub repository (which semantic-release does automatically) is a necessary prerequisite, but it does not automatically submit your plugin to the Obsidian team for review and inclusion in the community list.

The process is:
1.  **Initial Submission:** You must first submit your GitHub repository to the Obsidian team for an initial code review. They will check it for safety and functionality.
2.  **Approval:** Once your plugin is approved, it will be added to the community plugin list.
3.  **Automatic Updates:** After that initial approval, the Obsidian systems will automatically pick up new versions whenever you create a new GitHub Release (like the ones semantic-release creates) that contains the required `main.js`, `manifest.json`, and `styles.css` files.

If you haven't done the initial submission yet, you can find the official instructions on how to do so here: [Submit your plugin to the community list](https://docs.obsidian.md/Plugins/Getting+started/Submit+your+plugin).

### Release Assets

The automated release process will create a GitHub release with the following assets:
- `main.js` - The bundled plugin code
- `manifest.json` - Plugin metadata
- `styles.css` - Plugin styles
- `tab-search-mobile-{version}.zip` - Complete plugin package

### Mobile Testing Before Release

Since this is a mobile-only plugin, ensure you test all changes on actual mobile devices before releasing:

1. **Android Testing**: Use Chrome remote debugging to test on Android devices
2. **iOS Testing**: Test on iOS devices with available debugging tools
3. **Cross-Device Compatibility**: Test on different screen sizes and Android/iOS versions
4. **Theme Compatibility**: Test with different Obsidian mobile themes

### Version Strategy

This plugin follows semantic versioning:
- **Patch (x.x.1)**: Bug fixes, performance improvements, documentation updates
- **Minor (x.1.x)**: New features, UI improvements, additional settings
- **Major (1.x.x)**: Breaking changes, major architecture changes, API changes

Given the mobile-only nature and UI dependencies, most releases will likely be minor or patch versions.