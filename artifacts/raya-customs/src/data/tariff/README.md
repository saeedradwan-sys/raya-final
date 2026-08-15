# Jordan HS tariff chapters

Place chapter JSON files here: `01.json` … `98.json`.

Each file is an array of:
```json
{ "code": "01012100000", "chapter": "01", "descriptionAr": "...", "descriptionEn": "...", "dutyRateRaw": "5%", "parentHs8": "01012100" }
```

Loaded by `../jordanTariff.ts` via `import.meta.glob('./tariff/[0-9]*.json')`.

Copy the full set from `raya-customs-official-tariff.tgz` (see `docs/OFFICIAL_TARIFF_IMPORT.md`).
