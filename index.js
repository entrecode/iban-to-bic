const { electronicFormatIBAN, isValidIBAN } = require('ibantools');
const datasets = require('./datasets');
const generateFiles = require('./lib/generate');

module.exports = {
  ibanIsValid(iban) {
    iban = electronicFormatIBAN(iban);
    return isValidIBAN(iban);
  },
  ibanToBic(iban) {
    iban = electronicFormatIBAN(iban);
    if (!isValidIBAN(iban)) return;

    const country = iban.slice(0, 2);
    if (!datasets.hasCountry(country)) return;

    // see https://en.wikipedia.org/wiki/International_Bank_Account_Number#IBAN_formats_by_country
    let bankCode;
    if (country === 'AT') bankCode = iban.substr(4, 5);
    else if (country === 'BE') bankCode = iban.substr(4, 3);
    else if (country === 'CH') bankCode = iban.substr(4, 5);
    else if (country === 'CZ') bankCode = iban.substr(4, 4);
    else if (country === 'DE') bankCode = iban.substr(4, 8);
    else if (country === 'ES') bankCode = iban.substr(4, 4);
    else if (country === 'FR') bankCode = iban.substr(4, 5);
    else if (country === 'LT') bankCode = iban.substr(4, 5);
    else if (country === 'LU') bankCode = iban.substr(4, 3);
    else if (country === 'NL') bankCode = iban.substr(4, 4);
    if (!bankCode) return;

    return datasets.getData(country, bankCode);
  },
  // returns { succeeded, failed }: a generator failing for one country does not stop the others
  // from being written, and the datasets that did update are reloaded either way
  async generate() {
    const result = await generateFiles();
    await datasets.reload();
    return result;
  },
};
