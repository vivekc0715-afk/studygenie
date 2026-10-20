const { spawn } = require('child_process');
const path = require('path');

const serverDir = path.join(__dirname, 'bca-smartlearn-ai', 'server');
const clientDir = path.join(__dirname, 'bca-smartlearn-ai', 'client');

console.log('Starting BCA SmartLearn AI (Server on http://localhost:5000 & Client on http://localhost:5173)...');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

const server = spawn(npmCmd, ['run', 'dev'], { cwd: serverDir, stdio: 'inherit', shell: true });
const client = spawn(npmCmd, ['run', 'dev'], { cwd: clientDir, stdio: 'inherit', shell: true });

function shutdown() {
  server.kill();
  client.kill();
  process.exit();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
