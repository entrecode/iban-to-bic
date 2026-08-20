# Data sources per country

Where the bank-code-to-BIC mapping for each country comes from, and what is known about the
countries that are not supported yet. Verified 2026-08-19 unless noted otherwise.

Everything below was checked with actual requests. Where a claim is _not_ verified, it says so.

## Supported

| Country | Bank code in IBAN | Source                                      | Format |
| ------- | ----------------- | ------------------------------------------- | ------ |
| AT      | pos. 5–9 (5)      | OeNB                                        | XLSX   |
| BE      | pos. 5–7 (3)      | NBB                                         | XLSX   |
| CH      | pos. 5–9 (5)      | SIX Bankmaster REST API                     | JSON   |
| CZ      | pos. 5–8 (4)      | ČNB, Číselník kódů platebního styku (ČKPS)  | CSV    |
| DE      | pos. 5–12 (8)     | Bundesbank                                  | XLSX   |
| ES      | RIAD code         | ECB, monthly list of financial institutions | TSV    |
| FR      | pos. 5–9 (5)      | ECB, monthly list of financial institutions | TSV    |
| LT      | pos. 5–9 (5)      | Bank of Lithuania                           | CSV    |
| LU      | pos. 5–7 (3)      | ABBL                                        | XLSX   |
| NL      | pos. 5–8 (4)      | Betaalvereniging Nederland                  | XLSX   |

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
`certis` in `datasets-extended/cz.json`. Note there is a _versioned_ mirror of the same file
(`kody_bank_CR_253.csv`) — do not use it, it goes stale.

### LT — Bank of Lithuania

    https://www.lb.lt/uploads/documents/files/FIK_KODAI_<YYYYMMDD>-en.csv

The list "Lithuanian bank codes for IBAN-BIC and BIC+" maps the 5-digit national ID (= pos. 5–9
of the IBAN) to the BIC, e.g. `32500` → `REVOLT21` (Revolut Bank UAB). 229 data rows, all
national IDs unique, 138 distinct BICs. E-money institutions are included, unlike in the ECB
list. LT matters more than its size suggests: Revolut issues Lithuanian IBANs, so this is not
an edge case but every customer with a Revolut account.

Until late 2025 the list was a PDF (`LT-<date>-en.pdf`, last version `LT-20251118-en.pdf`);
since then it is a CSV. Known versions: `FIK_KODAI_20251121-en.csv` and
`FIK_KODAI_20260505-en.csv` (current as of 2026-08-19; verified by sweeping every date from
2025-11-01 — those two are the only hits).

Format details, verified against both versions:

- Header: `National ID;BIC Code;Financial Institution Name;Branch Name;Legal Entity Code;City;Branch Address;Zip Code;Location;Country`
  followed by five empty trailing columns (`;;;;;` on every line, header included).
- Semicolon-separated, CRLF, **Windows-1257** (Baltic) encoded — not UTF-8. Decoding as UTF-8
  throws on byte `0xA0`: several `Legal Entity Code` values carry a trailing non-breaking
  space (removed by `trim()`, which strips U+00A0), and names/addresses contain Lithuanian
  letters (`Gynėjų`, `Kęstučio`) plus CP125x smart quotes (`„…“`).
- One row is entirely empty (only semicolons) and must be skipped.

**Discovery.** The filename is dated and the index page that links the current one
(`https://www.lb.lt/en/iban-and-financial-institution-codes`) is behind a Cloudflare
challenge — HTTP 403 for curl and fetch regardless of user agent, as are the sitemap, the site
search and the Lithuanian page. The Wayback Machine has no snapshot newer than 2024-04, so it
cannot serve as an index either. But `/uploads/documents/files/` itself is not challenged,
**and old versions stay online** (the retired November PDF and the superseded
`FIK_KODAI_20251121` CSV both still return HTTP 200). So `lib/lt.js` probes dates backwards
from today (in Europe/Vilnius, the publisher's timezone) until the first HTTP 200, which is by
construction the newest version. The walk is bounded by `lastKnownDate`, the newest version
known when the generator was last touched — bump it occasionally, the probe count is "days
since `lastKnownDate`" and grows by one request per day until someone does.

The probing itself is not blocked: ~400 HEAD requests against `/uploads/documents/files/` in
one afternoon (6 in parallel) drew no 403, no 429 and no challenge, and hits are even served
from Cloudflare's cache (`cf-cache-status: HIT`). Two traps for the prober, both verified:

- A **miss is not a 404** — it is a `302` redirect to `http://www.lb.lt/`. The prober must not
  follow redirects (`redirect: 'manual'`); with fetch's default redirect-following, a miss
  comes back as HTTP 200 with the homepage HTML — and the homepage is behind the Cloudflare
  challenge, so it may also surface as an unexpected 403.
- **Node's TLS fingerprint matters.** `lib/generate.js` used to shuffle `tls.DEFAULT_CIPHERS`
  (added 2025-04 for data-loading problems with a source that was not recorded). With a
  shuffled cipher order Cloudflare answers the GET on the CSV with 403 — reproducibly, while
  the same request with Node's default cipher order gets 200. The shuffle was removed when LT
  was added; all nine generators were verified twice to succeed without it. If a source starts
  failing with the default fingerprint again, scope the workaround to that source instead of
  changing the global default.

## Researched, not implemented

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
country from it, but the `RIAD_CODE` only _happens_ to equal the national bank code for ES and
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

## Sources that keep moving

The spreadsheet sources rename and reshuffle things without notice, and the resulting error
usually looks like a download problem when it is not. `findSheet` and `findHeaderRow` in
`lib/utils.js` exist for this: they resolve the worksheet by name _prefix_ and search the first
ten rows for the header, instead of hardcoding a sheet name and a row number. Only the leading
header columns are checked, because trailing ones get renamed independently, and cell values are
compared trimmed because several sources have trailing spaces.

**NL — Betaalvereniging.** Changed shape twice: the worksheet was renamed from `BIC-lijst` to
`BIC-lijst | BIC-list`, the header row moved from row 4 to row 2, and the third column was
renamed from `Naam betaaldienstverlener` to `Betaaldienstverlener / Payment Service Provider`.
Both times the generator threw `Cannot read properties of undefined (reading 'A1')` while the
file itself downloaded fine.

**LU — ABBL.** The page moved from `abbl.lu/en/professionals/page/iban-and-bic-codes` (now 404)
to `www.abbl.lu/publications/abbl-luxembourg-register-of-iban-bic-codes/`, and the third column
was renamed from ` BIC Code` to `BICCode`. The spreadsheet link cannot be hardcoded at all: it is
served from a different host under a tokenised, versioned path
(`office-membernet.abbl.lu/newDocRequest/<token>/ABBL_LuxembourgRegisterofIBANBICCodes<version>.xlsx`),
so `lib/lu.js` scrapes the publication page for the first `.xlsx` link whose filename mentions
both `iban` and `bic`. Note the register lives on the *publications* page, not on the payments
page that describes it — the latter only links to the former.
