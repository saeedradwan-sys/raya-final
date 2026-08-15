import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dataset = JSON.parse(
  await readFile(new URL('../public/data/jordan-tariff.json', import.meta.url), 'utf8'),
);

assert.equal(dataset.meta.rows, 8311);
assert.equal(dataset.items.length, dataset.meta.rows);
assert.equal(new Set(dataset.items.map((item) => item.code)).size, dataset.items.length);
assert.equal(dataset.items.filter((item) => item.code.startsWith('2106')).length, 12);

const proteinConcentrate = dataset.items.find((item) => item.code === '21061000100');
assert.ok(proteinConcentrate, 'expected supplied 21061000100 tariff line');
assert.equal(proteinConcentrate.dutyRateRaw, '0');
assert.match(proteinConcentrate.descriptionAr, /بروتين/);
assert.equal(proteinConcentrate.descriptionEn, '');

const powderedJuice = dataset.items.find((item) => item.code === '21069050000');
assert.ok(powderedJuice, 'expected supplied 21069050000 tariff line');
assert.equal(powderedJuice.dutyRateRaw, '10');
assert.match(powderedJuice.descriptionEn, /Powdered juices/i);

assert.equal(dataset.meta.duplicateCodes, 0);
assert.equal(dataset.meta.blankArabicDescriptions, 0);
assert.equal(dataset.meta.blankEnglishReferences, 1039);
assert.equal(dataset.meta.blankDutyRates, 7);

console.log('Jordan tariff dataset integrity tests passed');
