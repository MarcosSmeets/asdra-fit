// Metro para monorepo pnpm: observa a raiz do workspace e resolve pacotes hoisted.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
function escapedPathPattern(targetPath) {
  return targetPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

config.watchFolders = [workspaceRoot];
// A API Nest recompÃµe `dist` removendo e recriando subpastas. Como o Metro
// observa a raiz do monorepo, sem este bloqueio ele tenta ler esses caminhos no
// meio da troca e emite ENOENT mesmo que o app mobile nÃ£o dependa deles.
const apiBuildPath = path.resolve(workspaceRoot, 'apps/api/dist');
const defaultBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : [config.resolver.blockList];
config.resolver.blockList = [
  ...defaultBlockList,
  new RegExp(`${escapedPathPattern(apiBuildPath)}(?:[\\\\/].*)?$`),
];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
