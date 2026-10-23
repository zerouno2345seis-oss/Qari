const { execFile } = require('child_process');

const esc = s => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

// Runs a shell command as root through the standard macOS admin password dialog.
function runAdmin(cmd, reason = 'MacPulse') {
  return new Promise((resolve, reject) => {
    const script = `do shell script "${esc(cmd)}" with prompt "${esc(reason)}" with administrator privileges`;
    execFile('/usr/bin/osascript', ['-e', script], { timeout: 120000 }, (err, out, errOut) =>
      err ? reject(new Error(errOut.trim() || err.message)) : resolve(out.trim()));
  });
}

module.exports = { runAdmin, esc };
