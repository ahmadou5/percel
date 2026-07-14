const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the monorepo packages folder so Metro can resolve workspace packages
config.watchFolders = [workspaceRoot];

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
