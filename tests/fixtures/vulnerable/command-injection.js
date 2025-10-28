/**
 * Command injection vulnerability samples for security testing
 * WARNING: These patterns are intentionally insecure for testing purposes
 */

import { exec } from 'child_process';

// Command injection via exec
export function pingHost(hostname) {
  exec(`ping -c 4 ${hostname}`, (error, stdout, stderr) => { // VULNERABLE: Unsanitized input
    console.log(stdout);
  });
}

// Command injection via spawn with shell
export function backupFile(filename) {
  exec(`tar -czf backup.tar.gz ${filename}`, (error, stdout) => { // VULNERABLE
    console.log('Backup created');
  });
}

// Path traversal
export function readUserFile(filepath) {
  const fs = require('fs');
  return fs.readFileSync(`/uploads/${filepath}`); // VULNERABLE: No path validation
}
