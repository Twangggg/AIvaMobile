const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// Fix tslib resolution: Metro resolves "tslib" via package.json exports
// (import condition) → modules/index.js → default import of tslib.js →
// Babel compiles to interopRequireDefault(require()).default.__extends
// which crashes since tslib.js has __esModule:true but no default export.
// Manually resolve tslib to tslib.js to bypass the broken ESM wrapper.
config.resolver.resolveRequest = (ctx, moduleName, platform) => {
  if (moduleName === 'tslib') {
    // Manually find tslib package by walking up from the requesting module
    let dir = path.dirname(ctx.originModulePath);
    while (dir !== path.dirname(dir)) {
      const pkgDir = path.join(dir, 'node_modules', 'tslib');
      const pkgJson = path.join(pkgDir, 'package.json');
      if (fs.existsSync(pkgJson)) {
        const tslibJs = path.join(pkgDir, 'tslib.js');
        if (fs.existsSync(tslibJs)) {
          return { filePath: tslibJs, type: 'sourceFile' };
        }
        // Fall back to main field
        const pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf-8'));
        if (pkg.main) {
          return { filePath: path.resolve(pkgDir, pkg.main), type: 'sourceFile' };
        }
        return { filePath: path.join(pkgDir, 'tslib.js'), type: 'sourceFile' };
      }
      dir = path.dirname(dir);
    }
  }
  return ctx.resolveRequest(ctx, moduleName, platform);
};

module.exports = config;