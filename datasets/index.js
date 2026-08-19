const { readFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const countries = ['AT', 'BE', 'CH', 'CZ', 'DE', 'ES', 'FR', 'LU', 'NL'];

const dataset = {};

countries.forEach(country => {
  try {
    dataset[country] = require(`./${country.toLowerCase()}.json`);
  } catch (error) {
    console.warn(`Failed to load dataset for ${country}:`, error);
    dataset[country] = undefined;
  }
});

module.exports = {
  hasCountry: country => dataset[country] !== undefined,
  getData: (country, bankCode) => dataset[country][bankCode],
  reload: () =>
    Array.fromAsync(countries, async country => {
      try {
        dataset[country] = JSON.parse(await readFile(resolve(__dirname, `./${country.toLowerCase()}.json`), 'utf8'));
      } catch (error) {
        console.warn(`Failed to reload dataset for ${country}:`, error);
        dataset[country] = undefined;
      }
    }),
};
