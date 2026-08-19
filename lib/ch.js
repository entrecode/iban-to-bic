const assert = require('assert');
const { writeOutputs, downloadJSON } = require('./utils');

// Swiss bank master data ("Bankenstamm"), published by SIX as a public, daily updated REST API.
// Record description: https://www.six-group.com/dam/download/banking-services/interbank-clearing/bc-bank-master/bankmaster-v3.0-record-description-en.pdf
const url = 'https://api.six-group.com/api/epcd/bankmaster/v3/bankmaster';

// the IID (bank clearing number) is 3 to 5 digits long, but always 5 digits within an IBAN
const iidLength = 5;

module.exports = async () => {
  const { entries } = await downloadJSON(url);

  assert(Array.isArray(entries) && entries.length > 0, 'no entries in SIX bank master dataset');

  const bankCodesObj = {};

  for (const entry of entries) {
    // "BankMasterConcatenated" entries only map a retired IID to its successor and carry no BIC
    if (entry.entryType !== 'BankMaster' || !entry.bic) continue;

    const code = String(entry.iid).padStart(iidLength, '0');
    assert(code.length === iidLength, `unexpected IID ${entry.iid}`);
    assert(bankCodesObj[code] === undefined, `duplicate IID ${code}`);

    bankCodesObj[code] = {
      code,
      bic: entry.bic,
      name: entry.bankOrInstitutionName,
      // QR_IID entries are the bank codes used in QR-IBANs, HEADQUARTERS/MAIN_BRANCH the regular ones
      iidType: entry.iidType,
      // LSV+/BDD is the Swiss direct debit scheme
      directDebit: {
        chf: entry.lsvBddChfParticipation === true,
        eur: entry.lsvBddEurParticipation === true,
      },
      address: {
        street: entry.streetName,
        buildingNumber: entry.buildingNumber,
        postalCode: entry.postCode,
        city: entry.townName,
        country: entry.country,
      },
    };
  }

  await writeOutputs('ch', bankCodesObj);
};
