const assert = require('assert');
const { writeOutputs, downloadCSV } = require('./utils');

// The Bank of Lithuania publishes "Lithuanian bank codes for IBAN-BIC and BIC+" as a CSV under a
// dated filename. The index page that links the current one is behind a Cloudflare challenge, but
// /uploads/documents/files/ is not, and superseded versions stay online. So the current file is
// discovered by probing dates backwards from today: the first HTTP 200 is the newest version.
// See docs/data-sources.md for the verification behind this.
const urlForDate = date => `https://www.lb.lt/uploads/documents/files/FIK_KODAI_${date}-en.csv`;

// bounds the backwards walk; bump to the discovered date occasionally to keep the walk short
const lastKnownDate = '20260505';

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

async function isPublished(url) {
  // a missing date answers 302 to the homepage (which sits behind the Cloudflare challenge),
  // not 404 — so redirects must not be followed and only a direct 200 counts as a hit
  const response = await fetch(url, { method: 'HEAD', redirect: 'manual' });
  return response.status === 200;
}

async function findCurrentUrl() {
  const dates = probeDates();
  for (let i = 0; i < dates.length; i += 10) {
    const chunk = dates.slice(i, i + 10);
    const published = await Promise.all(chunk.map(date => isPublished(urlForDate(date))));
    const index = published.indexOf(true);
    if (index !== -1) return urlForDate(chunk[index]);
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
