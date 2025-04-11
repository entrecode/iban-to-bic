const at = require('./at');
const be = require('./be');
const de = require('./de');
const frEs = require('./fr-es');
const lu = require('./lu');
const nl = require('./nl');
const tls = require('node:tls');

const [first, second, third, ...rest] = tls.DEFAULT_CIPHERS.split(':');
tls.DEFAULT_CIPHERS = [second, third, first, ...rest.sort(() => Math.random() - 0.5)].join(':');

async function generate() {
  return Promise.all([at(), be(), de(), frEs(), lu(), nl()]);
}

if (module.parent) {
  module.exports = generate;
} else {
  (async () => {
    await generate();
  })();
}