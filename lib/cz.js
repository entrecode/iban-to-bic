const assert = require('assert');
const { writeOutputs, downloadCSV } = require('./utils');

// "Číselník kódů platebního styku v České republice (ČKPS)", published by the Czech National Bank.
// The URL is unversioned and always points to the current version.
const url = 'https://www.cnb.cz/cs/platebni-styk/.galleries/ucty_kody_bank/download/kody_bank_CR.csv';

module.exports = async () => {
  const banks = await downloadCSV(url, { separator: ';' });

  assert(banks.length > 0, 'no rows in ČKPS dataset');
  assertColumns(banks[0]);

  const bankCodesObj = {};

  for (const bank of banks) {
    const code = column(bank, 'Kód platebního styku')?.trim();
    if (!code) continue;

    assert(bankCodesObj[code] === undefined, `duplicate bank code ${code}`);
    bankCodesObj[code] = {
      code,
      bic: column(bank, 'BIC kód (SWIFT)')?.trim() || undefined,
      name: column(bank, 'Poskytovatel platebních služeb')?.trim(),
      // "A" means the institution is a direct participant of the CERTIS clearing system
      certis: column(bank, 'Systém CERTIS')?.trim() === 'A',
    };
  }

  await writeOutputs('cz', bankCodesObj);
};

// the CSV is UTF-8 with a BOM, which ends up in the first column name
function column(row, name) {
  return row[name] ?? row[`﻿${name}`];
}

function assertColumns(row) {
  for (const name of ['Kód platebního styku', 'Poskytovatel platebních služeb', 'BIC kód (SWIFT)', 'Systém CERTIS']) {
    assert(column(row, name) !== undefined, `missing column "${name}" in ČKPS dataset`);
  }
}
