const assert = require('assert');
const { getCellValue, writeOutputs, downloadXLSX } = require('./utils');

const url = 'https://www.betaalvereniging.nl/wp-content/uploads/BIC-lijst-NL.xlsx';

// the sheet has been renamed before ("BIC-lijst" -> "BIC-lijst | BIC-list"), so match on the prefix
const sheetNamePrefix = 'BIC-lijst';

// the header has moved before (row 4 -> row 2), so search for it instead of hardcoding the row.
// only the first two column names are checked, the third one has been renamed independently.
const headerColumns = ['BIC', 'Identifier'];
const maxHeaderRow = 10;

function rowToObject(worksheet, row) {
  const col = n => {
    const value = getCellValue(worksheet, n, row);
    return typeof value === 'string' ? value.trim() : value;
  };
  return {
    bic: col(0),
    code: col(1),
    name: col(2),
  };
}

function findSheet(document) {
  const name = document.SheetNames.find(sheetName => sheetName.startsWith(sheetNamePrefix));
  assert(name !== undefined, `no sheet starting with "${sheetNamePrefix}", got [${document.SheetNames}]`);
  return document.Sheets[name];
}

function findHeaderRow(worksheet) {
  for (let row = 1; row <= maxHeaderRow; row++) {
    if (headerColumns.every((value, i) => getCellValue(worksheet, i, row) === value)) return row;
  }
  throw new Error(`no header row [${headerColumns}] within the first ${maxHeaderRow} rows`);
}

module.exports = async () => {
  const worksheet = findSheet(await downloadXLSX(url));
  const headerRow = findHeaderRow(worksheet);

  const bankCodesObj = {};
  for (let i = headerRow + 1; worksheet['A' + i] !== undefined; i++) {
    const row = rowToObject(worksheet, i);
    assert(bankCodesObj[row.code] === undefined, `duplicate identifier ${row.code}`);
    bankCodesObj[row.code] = row;
  }

  assert(Object.keys(bankCodesObj).length > 0, 'no rows in BIC-lijst-NL dataset');
  await writeOutputs('nl', bankCodesObj);
};
