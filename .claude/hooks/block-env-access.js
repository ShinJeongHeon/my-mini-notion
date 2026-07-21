#!/usr/bin/env node
/**
 * PreToolUse guard: blocks any read / write / delete of real .env files.
 *
 * Allowed:  .env.example, .env.sample, .env.template  (the committed contract)
 * Blocked:  .env, .env.local, .env.production, .env.*.local, ...
 *
 * Covers file tools (Read/Edit/Write/...) via file_path, and shell tools
 * (Bash/PowerShell) by scanning the command string.
 */

const ALLOWED = /^\.env\.(example|sample|template)$/i;

function isSecretEnvFile(filePath) {
  if (!filePath) return false;
  const base = String(filePath).replace(/\\/g, '/').split('/').pop() || '';
  if (!/^\.env(\.|$)/i.test(base)) return false;
  return !ALLOWED.test(base);
}

// `.env` as a path token — not `process.env` / `import.meta.env`.
const ENV_IN_COMMAND =
  /(?:^|[\s'"`/\\=:;|&()<>,[\]{}])\.env(?!\.(?:example|sample|template)\b)(?:\.[A-Za-z0-9_-]+)*/i;

function commandTouchesEnv(command) {
  return typeof command === 'string' && ENV_IN_COMMAND.test(command);
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
      systemMessage: `[env-guard] ${reason}`,
    })
  );
  process.exit(0);
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    process.exit(0); // never break the session on a parse failure
  }

  const tool = payload.tool_name || '';
  const input = payload.tool_input || {};

  const paths = [input.file_path, input.path, input.notebook_path].filter(Boolean);
  for (const p of paths) {
    if (isSecretEnvFile(p)) {
      deny(
        `'${p}' is a secret env file — reading, editing and deleting it is blocked. ` +
          `Use .env.example for the variable contract, and ask the user to set real values themselves.`
      );
    }
  }

  if (tool === 'Bash' || tool === 'PowerShell') {
    if (commandTouchesEnv(input.command)) {
      deny(
        `This command references a secret env file (.env / .env.local / ...). ` +
          `Shell access to env files is blocked. Use .env.example instead.`
      );
    }
  }

  process.exit(0);
});
