# iban-to-bic

[![GitHub license](https://img.shields.io/github/license/sigalor/iban-to-bic)](https://github.com/sigalor/iban-to-bic/blob/master/LICENSE) [![npm](https://img.shields.io/npm/v/iban-to-bic)](https://www.npmjs.com/package/iban-to-bic) [![Unit tests workflow status](https://github.com/sigalor/iban-to-bic/actions/workflows/tests.yaml/badge.svg)](https://github.com/sigalor/iban-to-bic/actions/workflows/tests.yaml)

Determines the SWIFT BIC of an IBAN. Currently supports IBANs from the following countries: Austria, Belgium, Czech Republic, France, Germany, Lithuania, Luxembourg, Netherlands, Spain, Switzerland.

## Usage

```javascript
const { ibanToBic } = require('iban-to-bic');

const bic = ibanToBic('DE51500105179975341634');
// bic is now "INGDDEFFXXX"
```

`ibanToBic` returns undefined if the IBAN is invalid (checked internally using [ibantools](https://github.com/Simplify/ibantools)) or if no corresponding BIC was found.

## Updating the dataset

The following will fetch the newest data from the respective national bank authorities (e.g. Bundesbank in Germany or OeNB in Austria) and regenerate the files in the `datasets` and the `datasets-extended` directory:

```
npm run generate
```

For Spain and France, data directly from the European Central Bank is used, see [here](https://www.ecb.europa.eu/stats/financial_corporations/list_of_financial_institutions/html/monthly_list-MID.en.html).

See [docs/data-sources.md](docs/data-sources.md) for the source behind every supported country, and for research notes on the countries that are not supported yet.

### programmatically update the dataset

You can also update the dataset at runtime whenever you want (e.g. at start-up):

```
const { ibanToBic, generate } = require('iban-to-bic');

const { succeeded, failed } = await generate();
```

`generate` does not reject when a single source is unavailable or has changed its format. Every generator that succeeded is written and reloaded, the ones that did not are returned in `failed` as `{ name, reason }` and logged via `console.warn`. Check `failed` if you want to know about it:

```
const { failed } = await generate();
for (const { name, reason } of failed) {
  logger.error(`could not update IBAN/BIC data for ${name}`, reason);
}
```


## License

MIT
