const assert = require('assert');
const { getTrimmedCellValue, findSheet, findHeaderRow, writeOutputs, downloadXLSX, downloadJSDOM } = require('./utils');

// The ABBL links the current spreadsheet under a tokenised, versioned URL
// (.../newDocRequest/<token>/ABBL_LuxembourgRegisterofIBANBICCodes<version>.xlsx), so it has to be
// discovered from the publication page rather than hardcoded.
const pageUrl = 'https://www.abbl.lu/publications/abbl-luxembourg-register-of-iban-bic-codes/';
const pageOrigin = 'https://www.abbl.lu';

const sheetNamePrefix = 'Organizations';
const headerColumns = ['Credit institution', 'IBAN Code'];

function rowToObject(worksheet, row) {
  const col = n => getTrimmedCellValue(worksheet, n, row);
  if (!col(1)) return;
  return {
    name: col(0),
    code: col(1),
    bic: col(2)?.replace(/ /g, ''),
  };
}

function findSpreadsheetUrl(document) {
  for (const link of document.querySelectorAll('a')) {
    const href = link.getAttribute('href');
    if (!href?.toLowerCase().endsWith('.xlsx')) continue;

    const fileName = href.split('/').pop().toLowerCase();
    if (!fileName.includes('iban') || !fileName.includes('bic')) continue;

    return href.startsWith('/') && !href.startsWith('//') ? pageOrigin + href : href;
  }

  throw new Error(`no IBAN/BIC spreadsheet linked on ${pageUrl}`);
}

module.exports = async () => {
  const url = findSpreadsheetUrl(await downloadJSDOM(pageUrl));
  const worksheet = findSheet(await downloadXLSX(url), sheetNamePrefix);
  const headerRow = findHeaderRow(worksheet, headerColumns);

  const bankCodesObj = {};
  for (let i = headerRow + 1; worksheet['A' + i] !== undefined; i++) {
    const row = rowToObject(worksheet, i);
    if (!row) continue;

    assert(bankCodesObj[row.code] === undefined, `duplicate IBAN code ${row.code}`);
    bankCodesObj[row.code] = row;
  }

  assert(Object.keys(bankCodesObj).length > 0, 'no rows in the Luxembourg IBAN/BIC register');
  await writeOutputs('lu', bankCodesObj);
};
