const { readFile } = require('fs/promises');
const dataset = {
  AT: undefined,
  BE: undefined,
  DE: undefined,
  ES: undefined,
  FR: undefined,
  LU: undefined,
  NL: undefined,
};

let dataIsLoaded = false;

module.exports = 
{
  hasCountry(country) {
    if (!dataIsLoaded) {
      throw new Error('Extended dataset is not loaded, please call `await activateExtendedDatasets()` first');
    }
    return dataset[country] !== undefined;
  },
  getData(country, bankCode) {
    if (!dataIsLoaded) {
      throw new Error('Extended dataset is not loaded, please call `await activateExtendedDatasets()` first');
    }
    return dataset[country][bankCode];
  },
  reload: async () => {
    dataset.AT = JSON.parse(await readFile(`./datasets-extended/at.json`, 'utf8'));
    dataset.BE = JSON.parse(await readFile(`./datasets-extended/be.json`, 'utf8'));
    dataset.DE = JSON.parse(await readFile(`./datasets-extended/de.json`, 'utf8'));
    dataset.ES = JSON.parse(await readFile(`./datasets-extended/es.json`, 'utf8'));
    dataset.FR = JSON.parse(await readFile(`./datasets-extended/fr.json`, 'utf8'));
    dataset.LU = JSON.parse(await readFile(`./datasets-extended/lu.json`, 'utf8'));
    dataset.NL = JSON.parse(await readFile(`./datasets-extended/nl.json`, 'utf8'));
    dataIsLoaded = true;
  },
  isDataLoaded() {
    return dataIsLoaded;
  }
}