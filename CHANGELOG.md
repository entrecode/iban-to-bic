# 1.6.0

- added datasets for Switzerland (incl. Liechtenstein-domiciled institutions) and the Czech Republic
- added `docs/data-sources.md` documenting the source per country and research notes on unsupported countries
- fixed the Netherlands generator, which broke when the source worksheet and its header row were renamed and moved
- fixed the Luxembourg generator, which broke when the ABBL moved its publication page and the spreadsheet behind a
  tokenised URL on another host
- `generate()` no longer rejects when a single source breaks: every generator that succeeds is still written and
  reloaded, and failures are reported instead. **Breaking**: the return value changed from `undefined` to
  `{ succeeded, failed }`, and a broken source no longer throws.

# 1.5.0 (2025-04-11)

- removed broken browser support
- updated datasets
- fixes tls fingerprinting for www.ecb.europa.eu

# 1.4.0 (2024-09-23)

- updated datasets

# 1.3.0 (2023-01-31)

- added datasets for Spain and France
- updated datasets

# 1.2.4 (2023-01-12)

- updated NPM dependencies
- updated datasets

# 1.2.3 (2022-09-28)

- updated to ibantools@4
- fixed generator for Luxembourg
- updated datasets

# 1.2.2 (2022-03-15)

- updated datasets

# 1.2.1 (2022-01-12)

- fix `browser` field in package.json

# 1.2.0 (2022-01-05)

- updated datasets, fixed Luxembourg scraper (Csardelacal) [#1](https://github.com/sigalor/iban-to-bic/pull/1)
- added browser support (Csardelacal) [#2](https://github.com/sigalor/iban-to-bic/pull/2)

# 1.1.0 (2021-07-03)

- added mapping from bank code to BIC for Belgium, Luxembourg and the Netherlands

# 1.0.0 (2021-07-02)

- initial release
