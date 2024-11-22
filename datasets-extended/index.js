const { readFile } = require('fs/promises');
const path = require('path');

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
    dataset.AT = JSON.parse(await readFile(path.resolve(__dirname, './at.json'), 'utf8'));
    dataset.BE = JSON.parse(await readFile(path.resolve(__dirname, './be.json'), 'utf8'));
    dataset.DE = JSON.parse(await readFile(path.resolve(__dirname, './de.json'), 'utf8'));
    dataset.ES = JSON.parse(await readFile(path.resolve(__dirname, './es.json'), 'utf8'));
    dataset.FR = JSON.parse(await readFile(path.resolve(__dirname, './fr.json'), 'utf8'));
    dataset.LU = JSON.parse(await readFile(path.resolve(__dirname, './lu.json'), 'utf8'));
    dataset.NL = JSON.parse(await readFile(path.resolve(__dirname, './nl.json'), 'utf8'));
    dataIsLoaded = true;
  },
  isDataLoaded() {
    return dataIsLoaded;
  }
}