const at = require('./at');
const be = require('./be');
const ch = require('./ch');
const cz = require('./cz');
const de = require('./de');
const frEs = require('./fr-es');
const lt = require('./lt');
const lu = require('./lu');
const nl = require('./nl');

// keyed by the datasets each generator writes, so a failure names the affected countries
const generators = {
  at,
  be,
  ch,
  cz,
  de,
  'es+fr': frEs,
  lt,
  lu,
  nl,
};

// Sources change their format without notice, so one broken generator must not keep the others
// from being written and reloaded. Failures are reported instead of thrown, see the return value.
async function generate() {
  const names = Object.keys(generators);
  const results = await Promise.allSettled(names.map(name => generators[name]()));

  const succeeded = [];
  const failed = [];

  results.forEach((result, i) => {
    const name = names[i];
    if (result.status === 'fulfilled') {
      succeeded.push(name);
    } else {
      failed.push({ name, reason: result.reason });
      console.warn(`Failed to generate dataset for ${name}:`, result.reason);
    }
  });

  return { succeeded, failed };
}

if (module.parent) {
  module.exports = generate;
} else {
  (async () => {
    const { failed } = await generate();
    if (failed.length) process.exitCode = 1;
  })();
}
