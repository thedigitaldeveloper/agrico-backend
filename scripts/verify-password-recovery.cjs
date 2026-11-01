/** Recovery settings regression checks. No CMS/database writes are performed. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');

const source = fs.readFileSync(path.resolve(__dirname, '../src/bootstrap/password-recovery.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function fixture(env) {
  const writes = [];
  const state = {
    advanced: { allow_register: true, email_reset_password: 'https://old.invalid/reset' },
    email: {
      reset_password: {
        options: {
          message: '<%= URL %>?code=<%= TOKEN %>',
          object: 'Existing subject',
          from: { name: 'Old', email: 'old@fixture.invalid' },
        },
      },
    },
  };
  const context = { exports: {}, process: { env }, URL };
  vm.runInNewContext(compiled, context);
  const strapi = {
    store() {
      return {
        get: async ({ key }) => state[key],
        set: async ({ key, value }) => { state[key] = value; writes.push(key); },
      };
    },
  };
  return { run: () => context.exports.configurePasswordRecovery(strapi), state, writes };
}

async function main() {
  let checks = 0;
  let sample = fixture({});
  await sample.run();
  assert.equal(sample.writes.length, 0);
  checks += 1;

  sample = fixture({ PASSWORD_RESET_URL: 'http://remote.invalid/reset-password' });
  await assert.rejects(sample.run(), /HTTPS/);
  assert.equal(sample.writes.length, 0);
  checks += 1;

  sample = fixture({
    PASSWORD_RESET_URL: 'https://site.fixture.invalid/reset-password',
    EMAIL_FROM: 'support@fixture.invalid',
    EMAIL_REPLY_TO: 'help@fixture.invalid',
  });
  await sample.run();
  assert.equal(sample.state.advanced.allow_register, true);
  assert.equal(sample.state.advanced.email_reset_password, 'https://site.fixture.invalid/reset-password');
  assert.equal(sample.state.email.reset_password.options.message, '<%= URL %>?code=<%= TOKEN %>');
  assert.equal(sample.state.email.reset_password.options.object, 'Existing subject');
  assert.equal(sample.state.email.reset_password.options.from.email, 'support@fixture.invalid');
  checks += 1;

  const before = sample.writes.length;
  await sample.run();
  assert.equal(sample.writes.length, before);
  checks += 1;

  sample = fixture({ PASSWORD_RESET_URL: 'http://localhost:3003/reset-password' });
  await sample.run();
  assert.equal(sample.state.advanced.email_reset_password, 'http://localhost:3003/reset-password');
  checks += 1;

  console.log(`PASS: ${checks} password recovery configuration checks (in-memory store; no database writes).`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
