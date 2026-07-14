const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Only watch the shared package source — NOT the entire workspace root
// Watching workspaceRoot causes ENOSPC (too many inotify watchers) on Linux
config.watchFolders = [
  path.resolve(workspaceRoot, 'packages/shared/src'),
];

// Tell Metro where to find modules — project node_modules first, then workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Resolve @percel/shared directly from its TypeScript source
config.resolver.extraNodeModules = {
  '@percel/shared': path.resolve(workspaceRoot, 'packages/shared/src'),
};

module.exports = config;
