const { spawn } = require('node:child_process');
const waitOn = require('wait-on');
const env = {...process.env, VUE_APP_TARGET:'electron', ELECTRON_DEV_URL:'http://localhost:8080'};
const server = spawn(process.execPath, [require.resolve('@vue/cli-service/bin/vue-cli-service.js'), 'serve'], {env,stdio:'inherit'});
let desktop;
function stop() { if (desktop) desktop.kill(); server.kill(); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
waitOn({resources:['http://localhost:8080'],timeout:120000}).then(() => {
  desktop = spawn(require('electron'), ['electron/main.js'], {env,stdio:'inherit'});
  desktop.on('exit', () => server.kill());
}).catch(error => {console.error(error);stop();process.exitCode=1;});
