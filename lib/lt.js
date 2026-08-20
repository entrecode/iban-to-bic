const assert = require('assert');
const { writeOutputs, downloadCSV } = require('./utils');

// The Bank of Lithuania publishes "Lithuanian bank codes for IBAN-BIC and BIC+" as a CSV under a
// dated filename. The index page that links the current one is behind a Cloudflare challenge, but
// /uploads/documents/files/ is not, and superseded versions stay online. So the current file is
// discovered by probing dates backwards from today: the first HTTP 200 is the newest version.
// See docs/data-sources.md for the verification behind this.
const urlForDate = date => `https://www.lb.lt/uploads/documents/files/FIK_KODAI_${date}-en.csv`;

// bounds the backwards walk; bump to the discovered date occasionally to keep the walk short
const lastKnownDate = '20260708';

// probing too hard earns 429s and 520s, and those must not be mistaken for "not published"
const concurrency = 3;
const attemptsPerDate = 3;

// every date from today down to lastKnownDate (inclusive), newest first, as YYYYMMDD
function probeDates() {
  // publication dates are Lithuanian, so "today" is evaluated in Europe/Vilnius explicitly
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vilnius' }).format(new Date());
  const dates = [];
  for (let t = Date.parse(`${today}T00:00:00Z`); ; t -= 24 * 60 * 60 * 1000) {
    const date = new Date(t).toISOString().slice(0, 10).replace(/-/g, '');
    if (date < lastKnownDate) return dates;
    dates.push(date);
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// 'hit' | 'miss' | 'inconclusive'. A date that cannot be classified must never count as a miss:
// the walk returns the first hit, so silently skipping a date would pin the dataset to an older
// version. Redirects are not followed, because a miss answers 302 to the (challenged) homepage.
async function probe(url) {
  for (let attempt = 1; attempt <= attemptsPerDate; attempt++) {
    let status;
    try {
      status = (await fetch(url, { method: 'HEAD', redirect: 'manual' })).status;
    } catch {
      status = undefined; // network error, retry
    }

    if (status === 200) return 'hit';
    // both spellings of "not published" have been observed: a plain 404, and a 302 to the homepage
    if (status === 404 || status === 302) return 'miss';
    if (attempt < attemptsPerDate) await sleep(500 * attempt);
  }
  return 'inconclusive';
}

async function findCurrentUrl() {
  const dates = probeDates();

  for (let i = 0; i < dates.length; i += concurrency) {
    const chunk = dates.slice(i, i + concurrency);
    const results = await Promise.all(chunk.map(date => probe(urlForDate(date))));

    for (let j = 0; j < chunk.length; j++) {
      // a hit ends the walk, so anything unresolved *newer* than it is what matters
      if (results[j] === 'hit') return urlForDate(chunk[j]);
      if (results[j] === 'inconclusive') {
        throw new Error(`cannot tell whether ${urlForDate(chunk[j])} exists, refusing to use older data`);
      }
    }
  }

  throw new Error(`no Lithuanian bank codes CSV published between ${lastKnownDate} and today`);
}

function assertColumns(row) {
  for (const name of ['National ID', 'BIC Code', 'Financial Institution Name', 'Branch Name', 'Legal Entity Code']) {
    assert(row[name] !== undefined, `missing column "${name}" in the Lithuanian bank codes CSV`);
  }
}

module.exports = async () => {
  const url = await findCurrentUrl();
  // Windows-1257 (Baltic), not UTF-8; also note the values below carry trailing non-breaking
  // spaces, which trim() removes
  const rows = await downloadCSV(url, { separator: ';' }, 'win1257');

  assert(rows.length > 0, 'no rows in the Lithuanian bank codes CSV');
  assertColumns(rows[0]);

  const bankCodesObj = {};

  for (const row of rows) {
    const code = row['National ID']?.trim();
    if (!code) continue; // the file contains one entirely empty row

    assert(bankCodesObj[code] === undefined, `duplicate national ID ${code}`);
    bankCodesObj[code] = {
      code,
      bic: row['BIC Code']?.trim() || undefined,
      name: row['Financial Institution Name']?.trim(),
      branch: row['Branch Name']?.trim() || undefined,
      legalEntityCode: row['Legal Entity Code']?.trim() || undefined,
      city: row['City']?.trim() || undefined,
    };
  }

  await writeOutputs('lt', bankCodesObj);
};
