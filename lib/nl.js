const assert = require('assert');
const { getTrimmedCellValue, findSheet, findHeaderRow, writeOutputs, downloadXLSX } = require('./utils');

const url = 'https://www.betaalvereniging.nl/wp-content/uploads/BIC-lijst-NL.xlsx';

const sheetNamePrefix = 'BIC-lijst';
const headerColumns = ['BIC', 'Identifier'];

function rowToObject(worksheet, row) {
  const col = n => getTrimmedCellValue(worksheet, n, row);
  return {
    bic: col(0),
    code: col(1),
    name: col(2),
  };
}

module.exports = async () => {
  const worksheet = findSheet(await downloadXLSX(url), sheetNamePrefix);
  const headerRow = findHeaderRow(worksheet, headerColumns);

  const bankCodesObj = {};
  for (let i = headerRow + 1; worksheet['A' + i] !== undefined; i++) {
    const row = rowToObject(worksheet, i);
    assert(bankCodesObj[row.code] === undefined, `duplicate identifier ${row.code}`);
    bankCodesObj[row.code] = row;
  }

  assert(Object.keys(bankCodesObj).length > 0, 'no rows in BIC-lijst-NL dataset');
  await writeOutputs('nl', bankCodesObj);
};
