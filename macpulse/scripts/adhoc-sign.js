// electron-builder afterPack hook: ad-hoc code-sign the .app (no Apple account needed).
// Apple Silicon refuses to run completely unsigned apps ("is damaged and can't be opened").
const { execFileSync } = require('child_process');
const path = require('path');

exports.default = async function adhocSign(ctx) {
  if (ctx.electronPlatformName !== 'darwin' || process.platform !== 'darwin') return;
  const app = path.join(ctx.appOutDir, `${ctx.packager.appInfo.productFilename}.app`);
  execFileSync('/usr/bin/codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
  execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit' });
};
