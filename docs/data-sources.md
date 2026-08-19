# Data sources per country

Where the bank-code-to-BIC mapping for each country comes from, and what is known about the
countries that are not supported yet. Verified 2026-08-19 unless noted otherwise.

Everything below was checked with actual requests. Where a claim is *not* verified, it says so.

## Supported

| Country | Bank code in IBAN | Source | Format |
| --- | --- | --- | --- |
| AT | pos. 5–9 (5) | OeNB | XLSX |
| BE | pos. 5–7 (3) | NBB | XLSX |
| CH | pos. 5–9 (5) | SIX Bankmaster REST API | JSON |
| CZ | pos. 5–8 (4) | ČNB, Číselník kódů platebního styku (ČKPS) | CSV |
| DE | pos. 5–12 (8) | Bundesbank | XLSX |
| ES | RIAD code | ECB, monthly list of financial institutions | TSV |
| FR | pos. 5–9 (5) | ECB, monthly list of financial institutions | TSV |
| LU | pos. 5–7 (3) | ABBL | XLSX |
| NL | pos. 5–8 (4) | Betaalvereniging Nederland | XLSX |

### CH — SIX Bankmaster

    https://api.six-group.com/api/epcd/bankmaster/v3/bankmaster

Public, no authentication, JSON, updated daily (`validOn` field). 1166 entries, of which 1127
carry a BIC. Keyed by `iid` (the bank clearing number), zero-padded to the 5 digits that appear
in the IBAN. A CSV variant exists at `/bankmaster_V3.csv`; the JSON is used because it needs no
parsing.

Notes:

- `entryType` is either `BankMaster` or `BankMasterConcatenated`. The latter (26 entries) only
  maps a retired IID to its successor via `newIid` and carries no BIC — skipped. If resolving
  retired IIDs ever becomes interesting, that is where the mapping lives.
- `iidType` is `HEADQUARTERS`, `MAIN_BRANCH` or `QR_IID`. All three are kept: `QR_IID` entries
  (range 30000–31101) are the bank codes that appear in Swiss QR-IBANs, which are ordinary
  IBANs and must resolve.
- The dataset is not limited to Swiss institutions. 20 entries are domiciled in LI and about 50
  elsewhere (DE, AT, LU, GB, …); those are foreign participants of the Swiss clearing systems
  and their IIDs are valid bank codes inside CH IBANs, so they are kept.
- `lsvBddChfParticipation` / `lsvBddEurParticipation` indicate participation in LSV+/BDD, the
  Swiss direct debit scheme. Stored under `directDebit` in `datasets-extended/ch.json`. This is
  the closest Swiss equivalent to the `SERVICE COR` flag in the Bundesbank reachability list.
- **LI is nearly free.** Liechtenstein IBANs use the same 5-digit IID space and the
  Liechtenstein banks are already in this dataset (e.g. `08800` → `LILALI2XXXX`). Supporting LI
  only needs `datasets/index.js` to alias LI to the CH dataset; it was left out to keep the
  dataset-per-country invariant intact.

### CZ — ČNB

    https://www.cnb.cz/cs/platebni-styk/.galleries/ucty_kody_bank/download/kody_bank_CR.csv

Unversioned URL that always serves the current version — no scraping needed. Semicolon-separated
CSV, UTF-8 **with a BOM** (which ends up in the first column name; `lib/cz.js` handles both
spellings). 47 rows, of which 35 carry a BIC.

Header: `Kód platebního styku;Poskytovatel platebních služeb;BIC kód (SWIFT);Systém CERTIS`

The `Systém CERTIS` column (`A` = direct participant of the Czech clearing system) is kept as
`certis` in `datasets-extended/cz.json`. Note there is a *versioned* mirror of the same file
(`kody_bank_CR_253.csv`) — do not use it, it goes stale.

## Researched, not implemented

### LT — Bank of Lithuania

Good data, awkward delivery. The list "Lithuanian bank codes for IBAN-BIC and BIC+" maps the
5-digit national ID (= pos. 5–9 of the IBAN) to the BIC, e.g. `32500` → `REVOLT21`
(Revolut Bank UAB). Columns: National ID, BIC Code, Financial Institution Name, Branch Name,
City, Branch Address, Zip Code, Location, Country.

Two obstacles:

- It is a **PDF**, so it needs a parser this repo does not have yet (only XLSX/CSV/HTML).
- The filename is **dated** (`LT-20251118-en.pdf`) and the index page that lists the current one
  (`https://www.lb.lt/en/iban-and-financial-institution-codes`) is behind a Cloudflare
  challenge — HTTP 403 for curl and fetch, including with a browser user agent. The
  `/uploads/documents/files/` path itself is *not* challenged and serves the PDF with HTTP 200.
  So the file is reachable but the current filename cannot be discovered automatically.

LT matters more than its size suggests: Revolut issues Lithuanian IBANs, so this is not an
edge case but every customer with a Revolut account.

### PL — NBP / EWIB

Promising but unverified. The NBP register (EWIB, `https://ewib.nbp.pl`) keeps clearing numbers
together with BICs, which is exactly the needed mapping. `ewib.nbp.pl` resolves and answered
HTTP 200 to a plain request, but reset the connection on any request that followed redirects or
sent a browser user agent, so the download path could not be confirmed from here. Needs a second
attempt before anyone commits to it.

### LV — Latvijas Banka

Partly algorithmic. Per Latvijas Banka, the first four characters of the BIC are used in the
Latvian IBAN (pos. 5–8), so the institution part needs no dataset at all. Only the 2-character
location code is not derivable, which a small list of the roughly 20 Latvian institutions would
cover. Not verified in practice.

### Not researched

IT, PT, IE, SK, SI, HU, HR, GR, RO, BG, FI, DK, SE, NO. For IT (ABI-BIC) and IE (NSC) free
official lists are not expected to exist, but that is an expectation, not a finding.

## Approaches that do not work

Two shortcuts look attractive and are both dead ends. Documented so nobody spends the time twice.

### The ECB list does not generalise beyond ES and FR

`lib/fr-es.js` uses the ECB monthly list of financial institutions, which contains a `BIC` and a
`RIAD_CODE` for institutions across the whole EU. It is tempting to derive every remaining
country from it, but the `RIAD_CODE` only *happens* to equal the national bank code for ES and
FR. For LT it is the company registration number: Revolut Bank UAB is `LT304580906`, not the
IBAN bank code `32500`.

The coverage is also thinner than it looks. The list only includes MFIs / credit institutions,
so e-money institutions are missing: of 79 LT rows only 22 carry a BIC at all, and `REVOLT21`
does not appear anywhere in the file. Using it as an allowlist would reject valid BICs.

### "BIC country must equal IBAN country" is not a reliable check

The BIC does encode a country at positions 5–6, and that part holds: across all 4733 BICs in the
Bundesbank reachability list, positions 5–6 are a valid ISO 3166-1 alpha-2 code without a single
exception.

The inference built on top of it does not hold. Comparing BIC country against
`COUNTRY_OF_REGISTRATION` for the 2823 ECB institutions that carry a BIC gives 31 mismatches
(1.10 %), in two groups:

- **French territories and Monaco** — 14× MC, 4× RE, 2× GP, 1× MQ. Their BICs carry their own
  ISO code while the accounts sit under FR IBANs. Systematic and enumerable.
- **Branches** — a branch registered in one country carrying its head office's BIC country, e.g.
  `CECAESMMLUX` (Spanish BIC, registered in LU), `TEAMDE71TAT` (German BIC, AT), `DEGRBEBBXXX`
  (Belgian BIC, NL). This set is **not** enumerable: any institution can open a branch anywhere
  at any time, and a hardcoded allowlist would produce false rejections of legitimate customers
  until someone notices and updates it.

Note the measurement uses registration country as a proxy for IBAN country, and the ECB list
omits e-money institutions, so the real exception rate is more likely higher than lower.

The conclusion is that a country-code comparison is usable as a soft signal at most, never as a
rejection criterion. A genuine confirmation of a BIC against an IBAN requires the country's bank
list — which is the whole point of this package.

## Known issue: the NL generator is broken

Unrelated to CH/CZ, but it breaks `generate()` for everyone, so it is worth knowing about.

`lib/nl.js` requests the worksheet named `BIC-lijst` from the Betaalvereniging XLSX. The file
downloads fine (HTTP 200, valid XLSX), but the sheet has been renamed to `BIC-lijst | BIC-list`
and the layout shifted — the data now starts at row 3, and the `A1` string and the header row the
generator asserts on have changed too. `xlsx` therefore returns `undefined` for the sheet and
`nl.js` throws `Cannot read properties of undefined (reading 'A1')`.

Consequences:

- `npm test` fails on the `generate new Data` case.
- `generate()` uses `Promise.all`, so it rejects. The other countries still finish and still
  write their files, because their promises were already running — but `datasets.reload()` in
  `index.js` runs *after* `generateFiles()` and is therefore skipped, so a running process keeps
  serving the datasets it started with until it is restarted.
