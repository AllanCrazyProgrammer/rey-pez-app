// Cross-platform environment setup; no shell-specific variable assignment.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const env = { ...process.env, VUE_APP_TARGET: 'electron' };
function run(script, args) {
  const result = spawnSync(process.execPath, [require.resolve(script), ...args], {cwd: root, env, stdio:'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run('@vue/cli-service/bin/vue-cli-service.js', ['build']);
if (!process.argv.includes('--assets-only')) {
  run('electron-builder/cli.js', [...process.argv.slice(2), '--publish', 'never']);
}
