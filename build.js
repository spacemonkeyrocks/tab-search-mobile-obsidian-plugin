require('dotenv').config(); // Load variables from .env file
const esbuild = require('esbuild');
const { exec } = require('child_process');

const isWatch = process.argv.includes('--watch');
const pluginId = require('./manifest.json').id;

// esbuild plugin to run hot-reload script on successful rebuild
const onRebuildPlugin = {
    name: 'onRebuild',
    setup(build) {
        build.onEnd(result => {
            if (result.errors.length > 0) {
                console.error('Build failed:', result.errors);
            } else {
                // Only run hot-reload if in watch mode AND the flag is not set to 'false'
                if (isWatch && process.env.HOT_RELOAD !== 'false') {
                    console.log('Build successful. Triggering hot-reload...');
                    exec(`node hot-reload.js ${pluginId}`, (err, stdout, stderr) => {
                        if (err) console.error(stderr);
                        else console.log(stdout);
                    });
                } else if (isWatch) {
                    console.log('Build successful. Hot-reload is disabled via .env file.');
                }
            }
        });
    },
};

// esbuild configuration
const buildOptions = {
    entryPoints: ['src/main.js'],
    bundle: true,
    outfile: 'main.js',
    platform: 'node',
    external: ['obsidian'],
    plugins: [onRebuildPlugin],
};

// Main build logic
async function main() {
    if (isWatch) {
        console.log('Starting esbuild in watch mode...');
        const ctx = await esbuild.context(buildOptions);
        await ctx.watch();
    } else {
        console.log('Starting one-time esbuild build...');
        await esbuild.build(buildOptions);
        console.log('Build complete.');
    }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});