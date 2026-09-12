import { accessSync, constants } from 'node:fs';

const ACT_CAP_URL = 'https://cap.act.com.jo/apex/cap.zul';
const DEFAULT_USERNAME = 'cap_guest';
const DEFAULT_PASSWORD = 'ACTact123';
const DEFAULT_TIMEOUT_MS = 30_000;

const WINDOWS_BROWSER_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const LINUX_BROWSER_PATHS = [
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

let browserPromise;
let requestQueue = Promise.resolve();

function enabled() {
  return !['0', 'false', 'off', 'no'].includes(String(process.env.RAYA_ACT_CAP_ENABLED || 'true').trim().toLowerCase());
}

function timeoutMs() {
  const configured = Number(process.env.RAYA_ACT_CAP_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Math.min(60_000, Math.max(10_000, Number.isFinite(configured) ? configured : DEFAULT_TIMEOUT_MS));
}

function existingPath(paths) {
  return paths.find((candidate) => {
    try {
      accessSync(candidate, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }) || null;
}

function browserPath() {
  const configured = String(process.env.RAYA_ACT_CAP_BROWSER_PATH || '').trim();
  if (configured) return configured;
  return existingPath(process.platform === 'win32' ? WINDOWS_BROWSER_PATHS : LINUX_BROWSER_PATHS);
}

export function actCapProviderInfo() {
  return {
    enabled: enabled(),
    browserConfigured: Boolean(browserPath()),
    url: ACT_CAP_URL,
  };
}

function normalizeCell(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function parseDate(value) {
  const normalized = normalizeCell(value);
  if (!normalized || normalized === '--') return null;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : normalized;
}

export function actCapCellsToRecord(cells, reference) {
  const values = Array.isArray(cells) ? cells.map(normalizeCell) : [];
  if (!values.some((value) => value.toUpperCase().includes(reference.toUpperCase()))) return null;
  return {
    billOfLading: values[0] || null,
    containerNumber: values[1] || null,
    isoType: values[2] || null,
    lineOperator: values[3] || null,
    category: values[4] || null,
    terminalState: values[5] || null,
    freightKind: values[6] || null,
    timeIn: values[7] || null,
    timeOut: values[8] || null,
    dwell: values[9] || null,
    lastFreeDay: values[10] || null,
    storagePaidThrough: values[11] || null,
    inboundVisit: values[12] || null,
    outboundVisit: values[13] || null,
    customsFormalityNumber: values[14] || null,
    clearanceReference: values[15] || null,
    unitStatus: values[16] || null,
    position: values[17] || null,
    pluggedIn: values[18] || null,
  };
}

export function actCapRecordToEvents(record, checkedAt = new Date().toISOString()) {
  if (!record) return [];
  const equipmentReference = record.containerNumber || null;
  const documentReferences = record.billOfLading
    ? [{ documentReferenceType: 'BKG', documentReferenceValue: record.billOfLading }]
    : undefined;
  const common = {
    equipmentReference,
    eventLocation: { UNLocationCode: 'JOAQJ', locationName: 'Aqaba Container Terminal' },
    eventClassifierCode: 'ACT',
    documentReferences,
    actCap: record,
  };
  const events = [];
  if (record.timeIn) {
    events.push({ ...common, equipmentEventTypeCode: 'GTIN', eventDateTime: parseDate(record.timeIn) });
  }
  if (record.timeOut) {
    events.push({ ...common, equipmentEventTypeCode: 'GTOT', eventDateTime: parseDate(record.timeOut) });
  }
  if (!events.length) {
    events.push({
      ...common,
      equipmentEventTypeCode: 'UNKNOWN',
      eventDateTime: checkedAt,
      milestone: record.unitStatus || record.terminalState || 'ACT terminal record found',
    });
  }
  return events;
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = (async () => {
      const executablePath = browserPath();
      if (!executablePath) throw new Error('browser_not_installed');
      const { chromium } = await import('playwright-core');
      return chromium.launch({
        executablePath,
        headless: true,
        args: process.platform === 'linux' ? ['--disable-dev-shm-usage'] : [],
      });
    })().catch((error) => {
      browserPromise = undefined;
      throw error;
    });
  }
  return browserPromise;
}

async function activeImportDialog(page) {
  const id = await page.locator('.z-window-modal').evaluateAll((dialogs) => dialogs
    .filter((dialog) => {
      const text = dialog.textContent || '';
      return text.includes('BL Number:') && text.includes('Container Number:');
    })
    .sort((left, right) => Number(getComputedStyle(right).zIndex) - Number(getComputedStyle(left).zIndex))[0]?.id || '');
  return id ? page.locator(`#${id}`) : null;
}

async function login(page, deadline) {
  await page.goto(ACT_CAP_URL, { waitUntil: 'domcontentloaded', timeout: deadline });
  const password = page.locator('input[type="password"]');
  if (await password.count()) {
    const username = page.locator('input[type="text"]');
    if (await username.count() !== 1 || await password.count() !== 1) throw new Error('login_form_changed');
    await username.fill(String(process.env.RAYA_ACT_CAP_USERNAME || DEFAULT_USERNAME));
    await password.fill(String(process.env.RAYA_ACT_CAP_PASSWORD || DEFAULT_PASSWORD));
    const loginButton = page.getByRole('button', { name: 'Log In', exact: true });
    if (await loginButton.count() !== 1) throw new Error('login_form_changed');
    await loginButton.click();
  }
  await page.waitForSelector('.homeviewwrapper', { state: 'visible', timeout: deadline });
}

async function query(page, reference, referenceType, deadline) {
  const dialog = await activeImportDialog(page);
  if (!dialog) throw new Error('inquiry_unavailable');
  const inputs = dialog.locator('input[type="text"]');
  if (await inputs.count() !== 2) throw new Error('inquiry_form_changed');
  await inputs.nth(referenceType === 'container' ? 1 : 0).fill(reference);
  const submit = dialog.getByRole('button', { name: 'OK', exact: true });
  if (await submit.count() !== 1) throw new Error('inquiry_form_changed');
  await submit.click();
  await dialog.waitFor({ state: 'detached', timeout: deadline });

  await page.waitForTimeout(700);
  const rows = await page.locator('tr').evaluateAll((elements, target) => elements
    .filter((row) => (row.textContent || '').toUpperCase().includes(target))
    .slice(0, 10)
    .map((row) => [...row.querySelectorAll('td')].map((cell) => (cell.textContent || '').replace(/\s+/g, ' ').trim())), reference);
  return rows.map((cells) => actCapCellsToRecord(cells, reference)).find(Boolean) || null;
}

async function performTracking(reference, referenceType) {
  if (!enabled()) return { ok: false, skipped: true, reason: 'not_configured' };
  const deadline = timeoutMs();
  let context;
  try {
    const browser = await getBrowser();
    context = await browser.newContext({ locale: 'en-GB', timezoneId: 'Asia/Amman' });
    const page = await context.newPage();
    page.setDefaultTimeout(deadline);
    await login(page, deadline);
    const record = await query(page, reference, referenceType, deadline);
    if (!record) return { ok: false, reason: 'no_record', detail: 'ACT accepted the inquiry but returned no matching terminal record.' };
    return { ok: true, record, events: actCapRecordToEvents(record) };
  } catch (error) {
    const message = String(error?.message || '');
    if (message.includes('browser_not_installed')) return { ok: false, reason: 'browser_not_installed' };
    if (message.includes('login')) return { ok: false, reason: 'authentication_failed' };
    if (message.includes('inquiry_')) return { ok: false, reason: 'portal_changed' };
    if (error?.name === 'TimeoutError') return { ok: false, reason: 'timeout' };
    return { ok: false, reason: 'provider_unavailable' };
  } finally {
    await context?.close().catch(() => {});
  }
}

export function requestActCap(reference, referenceType) {
  const run = requestQueue.then(
    () => performTracking(reference, referenceType),
    () => performTracking(reference, referenceType),
  );
  requestQueue = run.catch(() => {});
  return run;
}
