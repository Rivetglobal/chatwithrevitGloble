const { google } = require('googleapis');

const PREFERRED_AVAIL_TAB = 'Availability';
const PREFERRED_SETTINGS_TAB = 'Settings';

// Header synonyms — each canonical field has a priority list of normalized
// header tokens (lowercased, alphanumeric only). Lower index = higher
// priority. We pick the column whose normalized header best matches.
const HEADER_SYNONYMS = {
  date: ['date', 'day', 'appointmentdate', 'apptdate', 'bookingdate', 'scheduledate', 'when'],
  time: ['time', 'starttime', 'slot', 'hour', 'appointmenttime', 'appttime', 'bookingtime', 'start'],
  name: ['name', 'fullname', 'customername', 'clientname', 'customer', 'client', 'person', 'user', 'contactname', 'attendee', 'guest'],
  phone: ['phone', 'phonenumber', 'mobile', 'mobilenumber', 'contact', 'contactnumber', 'tel', 'telephone', 'cell', 'cellphone', 'number'],
  email: ['email', 'emailaddress', 'mail', 'emailaddr', 'customeremail', 'clientemail', 'contactemail', 'e-mail'],
  location: ['location', 'venue', 'branch', 'place', 'room', 'office', 'address', 'site', 'where'],
  status: ['status', 'state', 'availability', 'available', 'booked', 'bookingstatus'],
  createdAt: ['createdat', 'created', 'bookedat', 'timestamp', 'createdtime', 'booktime', 'savedat', 'recordedat'],
};

let cachedAuth = null;
let cachedClientEmail = null;

// Admin-panel override — set via setAdminServiceAccountJson().
// Takes priority over the GOOGLE_SERVICE_ACCOUNT_JSON env var.
let _adminServiceAccountJson = '';

function setAdminServiceAccountJson(json) {
  _adminServiceAccountJson = typeof json === 'string' ? json.trim() : '';
  cachedAuth = null;
  cachedClientEmail = null;
}

function getServiceAccountStatus() {
  const fromAdmin = Boolean(_adminServiceAccountJson);
  const fromEnv   = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  let clientEmail = '';
  try {
    const raw = _adminServiceAccountJson || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '';
    if (raw) clientEmail = JSON.parse(raw).client_email || '';
  } catch (_) { /* ignore */ }
  return {
    configured: fromAdmin || fromEnv,
    source: fromAdmin ? 'admin' : fromEnv ? 'env' : 'none',
    hasOverride: fromAdmin,
    hasEnv: fromEnv,
    clientEmail,
  };
}

function loadServiceAccount() {
  const raw = _adminServiceAccountJson || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    const err = new Error(
      'Google service account credentials are not configured. Go to the Admin Panel → Integrations and paste your service account JSON.'
    );
    err.code = 'NO_SERVICE_ACCOUNT';
    throw err;
  }
  let creds;
  try {
    creds = JSON.parse(raw);
  } catch (_) {
    const err = new Error('The Google service account JSON is not valid. Re-paste the full JSON file contents in the Admin Panel.');
    err.code = 'BAD_SERVICE_ACCOUNT';
    throw err;
  }
  if (!creds.client_email || !creds.private_key) {
    const err = new Error('The Google service account JSON is missing client_email or private_key.');
    err.code = 'BAD_SERVICE_ACCOUNT';
    throw err;
  }
  return creds;
}

function getServiceAccountEmail() {
  if (cachedClientEmail) return cachedClientEmail;
  const creds = loadServiceAccount();
  cachedClientEmail = creds.client_email;
  return cachedClientEmail;
}

function getAuth() {
  if (cachedAuth) return cachedAuth;
  const creds = loadServiceAccount();
  // IMPORTANT: use the object form. The positional-args form
  // `new google.auth.JWT(email, null, key, scopes)` silently fails to
  // attach the private key in current googleapis versions, which makes
  // every Sheets call go out unauthenticated and Google rejects them
  // with "Method doesn't allow unregistered callers".
  cachedAuth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  cachedClientEmail = creds.client_email;
  return cachedAuth;
}

function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

// Wrap a Google Sheets API call with a single retry on transient 5xx
// server errors, with a short backoff. All other errors (4xx, network, etc.)
// bubble immediately so the caller can render the friendly message.
async function withRetry(label, fn) {
  try {
    return await fn();
  } catch (err) {
    const status = err?.code || err?.response?.status;
    const isTransient5xx = typeof status === 'number' && status >= 500 && status < 600;
    if (!isTransient5xx) throw err;
    console.warn(`[sheets] ${label} transient ${status}; retrying once`);
    await new Promise((r) => setTimeout(r, 500));
    return fn();
  }
}

// Extract sheet id from a Google Sheets URL OR accept a raw id.
// Also returns the gid from `#gid=N` if present.
function parseSheetId(input) {
  const s = String(input || '').trim();
  if (!s) return null;
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(s)) return s;
  return null;
}

function parseSheetGid(input) {
  const s = String(input || '');
  const m = s.match(/[#&?]gid=(\d+)/);
  return m ? Number(m[1]) : null;
}

function friendlyApiError(err, fallback = 'Google Sheets error.') {
  const status = err?.code || err?.response?.status;
  const msg = err?.errors?.[0]?.message || err?.response?.data?.error?.message || err?.message || '';
  if (status === 403 || /permission|forbidden/i.test(msg)) {
    return `Google rejected the request: ${msg || 'permission denied'}. Make sure the sheet is shared with the service account as Editor.`;
  }
  if (status === 404 || /not found/i.test(msg)) {
    return 'Sheet not found. Check the link and that the sheet still exists.';
  }
  if (status === 400) {
    return `Google Sheets refused the request: ${msg || 'bad request'}.`;
  }
  return `${fallback}${msg ? ` (${msg})` : ''}`;
}

// --- Schema detection ---------------------------------------------------

function normalizeHeader(s) {
  return String(s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Convert 0-based column index to A1 letters (0->A, 25->Z, 26->AA).
function colIdxToA1(idx) {
  let n = idx + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s || 'A';
}

// Quote a tab name for use in A1 notation (escapes any single quotes).
function quoteTab(name) {
  return `'${String(name).replace(/'/g, "''")}'`;
}

// Pick the best column index for a canonical field given the normalized
// header tokens. Synonyms list is priority-ordered.
function pickColumn(normalizedHeaders, synonyms) {
  // 1) Exact match by priority
  for (const syn of synonyms) {
    const i = normalizedHeaders.indexOf(syn);
    if (i !== -1) return i;
  }
  // 2) "contains" match (e.g. "customer name" -> contains "name")
  for (const syn of synonyms) {
    for (let i = 0; i < normalizedHeaders.length; i++) {
      if (normalizedHeaders[i].includes(syn)) return i;
    }
  }
  return -1;
}

function buildColumnMap(headers) {
  const norm = headers.map(normalizeHeader);
  const map = {};
  const used = new Set();
  // Process in order so earlier fields take precedence when two fields
  // would map to the same column (e.g. "Date" only).
  for (const field of Object.keys(HEADER_SYNONYMS)) {
    const idx = pickColumn(norm, HEADER_SYNONYMS[field]);
    if (idx !== -1 && !used.has(idx)) {
      map[field] = idx;
      used.add(idx);
    }
  }
  return map;
}

// Detect the booking schema for this sheet. Tries (1) a tab named
// "Availability" (case-insensitive), (2) a tab matching opts.tabName,
// (3) a tab matching the gid in the URL, (4) the first tab whose header
// row has detectable date+time columns. Returns:
// { sheetTitle, tabName, headerCount, headers, columnMap,
//   settingsTabName, requiredOk, missing }
async function detectSchema(sheetId, opts = {}) {
  const sheets = getSheetsClient();
  let meta;
  try {
    meta = await withRetry('spreadsheets.get', () => sheets.spreadsheets.get({
      spreadsheetId: sheetId,
      includeGridData: false,
    }));
  } catch (err) {
    throw new Error(friendlyApiError(err, 'Could not open the sheet.'));
  }
  const tabs = (meta.data.sheets || []).map((s) => ({
    title: s.properties?.title || '',
    sheetId: s.properties?.sheetId,
  }));
  if (!tabs.length) {
    throw new Error('The sheet has no tabs. Add a tab with your booking data and try again.');
  }
  const sheetTitle = meta.data.properties?.title || '';

  // Pre-fetch the header row of every tab in one batched call. Cheaper than
  // N round-trips when the user has many tabs.
  let headerRowsByTab = {};
  try {
    const ranges = tabs.map((t) => `${quoteTab(t.title)}!A1:Z1`);
    const batch = await withRetry('values.batchGet headers', () => sheets.spreadsheets.values.batchGet({
      spreadsheetId: sheetId,
      ranges,
    }));
    (batch.data.valueRanges || []).forEach((vr, i) => {
      headerRowsByTab[tabs[i].title] = (vr.values && vr.values[0]) || [];
    });
  } catch (err) {
    throw new Error(friendlyApiError(err, 'Could not read tab headers.'));
  }

  // Identify the Settings tab (any tab whose name contains "setting") —
  // we won't read it now, just remember its name. Fully optional.
  const settingsTab = tabs.find((t) => /setting/i.test(t.title));
  const settingsTabName = settingsTab ? settingsTab.title : null;

  // Candidate booking tabs (everything except the settings tab).
  const candidates = tabs.filter((t) => !settingsTabName || t.title !== settingsTabName);

  // Tab selection priority:
  // 1) explicit opts.tabName (case-insensitive exact match)
  // 2) gid match
  // 3) tab named "Availability" (case-insensitive)
  // 4) first candidate whose headers have detectable date AND time
  // 5) first candidate
  let chosen = null;
  if (opts.tabName) {
    chosen = candidates.find((t) => t.title.toLowerCase() === String(opts.tabName).toLowerCase()) || null;
  }
  if (!chosen && opts.gid != null) {
    chosen = candidates.find((t) => Number(t.sheetId) === Number(opts.gid)) || null;
  }
  if (!chosen) {
    chosen = candidates.find((t) => t.title.toLowerCase() === PREFERRED_AVAIL_TAB.toLowerCase()) || null;
  }
  if (!chosen) {
    for (const t of candidates) {
      const headers = headerRowsByTab[t.title] || [];
      const map = buildColumnMap(headers);
      if (map.date != null && map.time != null) { chosen = t; break; }
    }
  }
  if (!chosen) chosen = candidates[0] || tabs[0];

  const headers = headerRowsByTab[chosen.title] || [];
  if (headers.length === 0) {
    throw new Error(`The tab "${chosen.title}" appears to be empty. Add a header row (e.g. Date, Time, Name, Status) and try again.`);
  }
  const columnMap = buildColumnMap(headers);
  const missing = [];
  if (columnMap.date == null) missing.push('a date column (e.g. "Date" or "Day")');
  if (columnMap.time == null) missing.push('a time column (e.g. "Time" or "Slot")');
  if (columnMap.name == null) missing.push('a name column (e.g. "Name" or "Customer")');

  return {
    sheetTitle,
    tabName: chosen.title,
    tabId: chosen.sheetId,
    headerCount: headers.length,
    headers,
    columnMap,
    settingsTabName,
    requiredOk: missing.length === 0,
    missing,
  };
}

// --- Read / Write -------------------------------------------------------

// Read all data rows from the booking tab, mapped into objects with the
// canonical field names regardless of column order.
async function readAvailability(sheetId, schema) {
  const sheets = getSheetsClient();
  const lastCol = colIdxToA1(Math.max(schema.headerCount - 1, 0));
  const range = `${quoteTab(schema.tabName)}!A1:${lastCol}10000`;
  let resp;
  try {
    resp = await withRetry('values.get availability', () => sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
      valueRenderOption: 'FORMATTED_VALUE',
    }));
  } catch (err) {
    throw new Error(friendlyApiError(err, `Could not read the "${schema.tabName}" tab.`));
  }
  const values = resp.data.values || [];
  if (values.length === 0) return { rows: [], headerRowIndex: 1 };
  const cm = schema.columnMap || {};
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i] || [];
    const get = (field) => (cm[field] != null ? String(r[cm[field]] || '').trim() : '');
    rows.push({
      rowNumber: i + 1,
      Date: get('date'),
      Time: get('time'),
      Location: get('location'),
      Name: get('name'),
      Phone: get('phone'),
      Email: get('email'),
      Status: get('status'),
      CreatedAt: get('createdAt'),
      _raw: r,
    });
  }
  return { rows, headerRowIndex: 1 };
}

// Read the Settings tab into a key/value object. No header rule — first
// non-empty A column is the key, B column is the value. Skips a row that
// looks like a header ("key | value"). Returns {} if no Settings tab.
async function readSettings(sheetId, settingsTabName) {
  if (!settingsTabName) return {};
  const sheets = getSheetsClient();
  try {
    const resp = await withRetry('values.get settings', () => sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${quoteTab(settingsTabName)}!A1:B1000`,
    }));
    const values = resp.data.values || [];
    const out = {};
    for (const r of values) {
      const k = String(r[0] || '').trim();
      const v = String(r[1] || '').trim();
      if (!k) continue;
      if (k.toLowerCase() === 'key' && v.toLowerCase() === 'value') continue;
      out[k] = v;
    }
    return out;
  } catch (err) {
    if (err?.code === 400 || /not found/i.test(err?.message || '')) return {};
    // Fail soft: a misconfigured Settings tab should never break booking.
    console.warn('[sheets] readSettings soft-failed:', err?.message || err);
    return {};
  }
}

// Update an existing row's mapped fields. Reads the row first so we don't
// blow away cells the user's sheet stores in unmapped columns.
async function updateBookingRow(sheetId, schema, rowNumber, fields) {
  const sheets = getSheetsClient();
  const lastCol = colIdxToA1(Math.max(schema.headerCount - 1, 0));
  const rowRange = `${quoteTab(schema.tabName)}!A${rowNumber}:${lastCol}${rowNumber}`;
  // Fetch existing row so unmapped columns stay intact.
  let existing = [];
  try {
    const resp = await withRetry('values.get row', () => sheets.spreadsheets.values.get({
      spreadsheetId: sheetId, range: rowRange,
    }));
    existing = (resp.data.values && resp.data.values[0]) || [];
  } catch (_) { existing = []; }
  const next = new Array(schema.headerCount).fill('');
  for (let i = 0; i < schema.headerCount; i++) next[i] = String(existing[i] != null ? existing[i] : '');
  const cm = schema.columnMap || {};
  const setIf = (field, val) => {
    if (cm[field] == null || val == null) return;
    next[cm[field]] = String(val);
  };
  setIf('name', fields.name);
  if (fields.phone !== undefined) setIf('phone', fields.phone);
  if (fields.email !== undefined) setIf('email', fields.email);
  setIf('status', fields.status || 'Booked');
  if (fields.createdAt !== undefined) setIf('createdAt', fields.createdAt);

  try {
    await withRetry('values.update', () => sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: rowRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [next] },
    }));
  } catch (err) {
    throw new Error(friendlyApiError(err, 'Could not write the booking.'));
  }
}

// Append a brand-new booked row when no matching slot row existed yet.
// Builds a row of length=headerCount and places each value at its mapped
// column, leaving unmapped columns blank.
async function appendBookingRow(sheetId, schema, fields) {
  const sheets = getSheetsClient();
  const cm = schema.columnMap || {};
  const row = new Array(schema.headerCount).fill('');
  const setIf = (field, val) => {
    if (cm[field] == null || val == null) return;
    row[cm[field]] = String(val);
  };
  setIf('date', fields.date);
  setIf('time', fields.time);
  setIf('location', fields.location);
  setIf('name', fields.name);
  setIf('phone', fields.phone);
  setIf('email', fields.email);
  setIf('status', fields.status || 'Booked');
  setIf('createdAt', fields.createdAt);

  const lastCol = colIdxToA1(Math.max(schema.headerCount - 1, 0));
  try {
    await withRetry('values.append', () => sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${quoteTab(schema.tabName)}!A:${lastCol}`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    }));
  } catch (err) {
    throw new Error(friendlyApiError(err, 'Could not append the booking.'));
  }
}

// --- Business hours parsing ---------------------------------------------
// Accepts "09:00-17:00", "9:00 - 17:00", "09:00–17:00" (en-dash),
// "9am-5pm", or two ranges separated by comma e.g. "09:00-12:00,13:00-17:00".
function parseBusinessHours(s) {
  const text = String(s || '').trim();
  if (!text) return null;
  const parts = text.split(/[,;]/).map((p) => p.trim()).filter(Boolean);
  const ranges = [];
  for (const p of parts) {
    const m = p.match(/^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–to]+\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*$/i);
    if (!m) return null;
    const toMin = (h, mm, ap) => {
      let hour = parseInt(h, 10);
      const mins = parseInt(mm || '0', 10);
      if (ap) {
        const isPm = ap.toLowerCase() === 'pm';
        if (hour === 12) hour = isPm ? 12 : 0;
        else if (isPm) hour += 12;
      }
      return hour * 60 + mins;
    };
    const start = toMin(m[1], m[2], m[3]);
    const end = toMin(m[4], m[5], m[6]);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
    ranges.push({ startMin: start, endMin: end });
  }
  return ranges.length ? ranges : null;
}

function parseTimeToMinutes(s) {
  const t = String(s || '').trim();
  if (!t) return null;
  const m = t.match(/^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*$/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const mins = parseInt(m[2] || '0', 10);
  if (m[3]) {
    const isPm = m[3].toLowerCase() === 'pm';
    if (hour === 12) hour = isPm ? 12 : 0;
    else if (isPm) hour += 12;
  }
  if (hour < 0 || hour > 23 || mins < 0 || mins > 59) return null;
  return hour * 60 + mins;
}

function isWithinBusinessHours(time, businessHoursStr) {
  const ranges = parseBusinessHours(businessHoursStr);
  if (!ranges) return true;
  const tMin = parseTimeToMinutes(time);
  if (tMin == null) return true;
  return ranges.some((r) => tMin >= r.startMin && tMin < r.endMin);
}

// A row is "free" if either there's no Status column at all (in which case
// we infer freeness from an empty Name cell) or the Status cell says so.
function isSlotFree(row) {
  const status = (row.Status || '').toLowerCase();
  if (!status) {
    // No status — empty Name means open slot.
    return !(row.Name && row.Name.trim());
  }
  return status === 'available' || status === 'open' || status === 'free';
}

function normalizeTime(t) { return String(t || '').trim().toLowerCase().replace(/\s+/g, ''); }
function normalizeDate(d) { return String(d || '').trim(); }

function findMatchingRow(rows, { date, time, location }) {
  const wantDate = normalizeDate(date);
  const wantTime = normalizeTime(time);
  const wantLoc = String(location || '').trim().toLowerCase();
  return rows.find((r) =>
    normalizeDate(r.Date) === wantDate &&
    normalizeTime(r.Time) === wantTime &&
    (!wantLoc || (r.Location || '').toLowerCase() === wantLoc)
  );
}

// --- Generic dynamic-sheet helpers --------------------------------------
// These power the "general purpose AI over a spreadsheet" mode. No
// assumption about the use case (booking, CRM, tasks, leads, anything).

// Snapshot every tab in the spreadsheet: name + headers + rowCount + a few
// sample rows. Used to brief the model on the live sheet structure.
async function getSpreadsheetSnapshot(sheetId, opts = {}) {
  const sheets = getSheetsClient();
  const sampleRows = Math.max(0, Math.min(opts.sampleRows ?? 3, 10));
  let meta;
  try {
    meta = await withRetry('spreadsheets.get snapshot', () => sheets.spreadsheets.get({
      spreadsheetId: sheetId,
      includeGridData: false,
    }));
  } catch (err) {
    throw new Error(friendlyApiError(err, 'Could not open the sheet.'));
  }
  const tabs = (meta.data.sheets || []).map((s) => ({
    title: s.properties?.title || '',
    sheetId: s.properties?.sheetId,
    rowCount: s.properties?.gridProperties?.rowCount || 0,
    columnCount: s.properties?.gridProperties?.columnCount || 0,
  }));
  if (!tabs.length) return { sheetTitle: meta.data.properties?.title || '', tabs: [] };

  // Batch-read header row + sample rows for every tab in one call.
  const ranges = tabs.map((t) => `${quoteTab(t.title)}!A1:ZZ${1 + sampleRows}`);
  let valueRanges = [];
  try {
    const batch = await withRetry('values.batchGet snapshot', () => sheets.spreadsheets.values.batchGet({
      spreadsheetId: sheetId,
      ranges,
    }));
    valueRanges = batch.data.valueRanges || [];
  } catch (err) {
    throw new Error(friendlyApiError(err, 'Could not read the sheet contents.'));
  }

  const out = tabs.map((t, i) => {
    const values = valueRanges[i]?.values || [];
    const headers = (values[0] || []).map((h) => String(h || ''));
    const samples = values.slice(1, 1 + sampleRows).map((r) => r.map((c) => String(c == null ? '' : c)));
    return {
      name: t.title,
      tabId: t.sheetId,
      headers,
      sampleRows: samples,
      sheetRowCount: t.rowCount,
    };
  });
  return {
    sheetTitle: meta.data.properties?.title || '',
    tabs: out,
  };
}

// Get just the header row of a tab (refreshed on demand at tool-call time).
async function getTabHeaders(sheetId, tabName) {
  const sheets = getSheetsClient();
  try {
    const resp = await withRetry('values.get headers', () => sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${quoteTab(tabName)}!A1:ZZ1`,
    }));
    return (resp.data.values && resp.data.values[0] ? resp.data.values[0] : []).map((h) => String(h || ''));
  } catch (err) {
    throw new Error(friendlyApiError(err, `Could not read headers of "${tabName}".`));
  }
}

// Read rows from a tab as objects keyed by header name. Optional filter is
// a {headerName: substring} map (case-insensitive contains).
async function readTabRows(sheetId, tabName, opts = {}) {
  const sheets = getSheetsClient();
  const limit = Math.max(1, Math.min(opts.limit || 50, 500));
  const filter = opts.filter && typeof opts.filter === 'object' ? opts.filter : null;

  let resp;
  try {
    resp = await withRetry('values.get tab', () => sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${quoteTab(tabName)}!A1:ZZ10000`,
      valueRenderOption: 'FORMATTED_VALUE',
    }));
  } catch (err) {
    throw new Error(friendlyApiError(err, `Could not read "${tabName}".`));
  }
  const values = resp.data.values || [];
  if (!values.length) return { headers: [], rows: [] };
  const headers = (values[0] || []).map((h) => String(h || ''));
  const headerNorms = headers.map((h) => normalizeHeader(h));

  // Resolve filter keys to column indices using header synonym matching
  // (so "name" filter hits a "Customer Name" column).
  const filterIdx = [];
  if (filter) {
    for (const [k, v] of Object.entries(filter)) {
      if (v == null || v === '') continue;
      const kn = normalizeHeader(k);
      let idx = headerNorms.indexOf(kn);
      if (idx === -1) idx = headerNorms.findIndex((h) => h.includes(kn) || kn.includes(h));
      if (idx !== -1) filterIdx.push({ idx, needle: String(v).toLowerCase() });
    }
  }

  const rows = [];
  for (let i = 1; i < values.length && rows.length < limit; i++) {
    const r = values[i] || [];
    if (filterIdx.length) {
      const ok = filterIdx.every(({ idx, needle }) => String(r[idx] || '').toLowerCase().includes(needle));
      if (!ok) continue;
    }
    const obj = { _row: i + 1 };
    headers.forEach((h, j) => { obj[h] = String(r[j] == null ? '' : r[j]); });
    rows.push(obj);
  }
  return { headers, rows };
}

// Map a {headerName: value} object to a column-aligned array of length
// = headers.length. Header matching is case-insensitive + alnum-normalized
// so the model doesn't need to mirror exact capitalization.
// Sanitize a cell value so Google Sheets never interprets AI-generated text
// as a formula (e.g. a phone number "+44 7..." was rendering as #ERROR!).
// If the string begins with =, +, -, or @ AND is not a plain number, we
// prefix it with a single apostrophe — Sheets strips the apostrophe on
// display but treats the cell as text.
function safeCellValue(v) {
  if (v == null) return '';
  const s = String(v);
  if (!s.length) return '';
  const first = s[0];
  if ((first === '=' || first === '+' || first === '-' || first === '@') && !/^-?\d+(\.\d+)?$/.test(s)) {
    return "'" + s;
  }
  return s;
}

function alignValuesToHeaders(headers, valuesObj) {
  const headerNorms = headers.map((h) => normalizeHeader(h));
  const row = new Array(headers.length).fill('');
  const unknown = [];
  for (const [k, v] of Object.entries(valuesObj || {})) {
    if (v == null) continue;
    const kn = normalizeHeader(k);
    let idx = headerNorms.indexOf(kn);
    if (idx === -1) idx = headerNorms.findIndex((h) => h.includes(kn) || kn.includes(h));
    if (idx === -1) { unknown.push(k); continue; }
    row[idx] = safeCellValue(v);
  }
  return { row, unknown };
}

async function appendRowByHeaders(sheetId, tabName, valuesObj) {
  const sheets = getSheetsClient();
  const headers = await getTabHeaders(sheetId, tabName);
  if (!headers.length) {
    throw new Error(`The "${tabName}" tab has no header row. Add column names in row 1 first.`);
  }
  const { row, unknown } = alignValuesToHeaders(headers, valuesObj);
  const lastCol = colIdxToA1(headers.length - 1);
  let appendedRowNumber = null;
  try {
    const resp = await withRetry('values.append generic', () => sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${quoteTab(tabName)}!A:${lastCol}`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    }));
    const updRange = resp.data?.updates?.updatedRange || '';
    const m = updRange.match(/!A(\d+):/);
    if (m) appendedRowNumber = Number(m[1]);
  } catch (err) {
    throw new Error(friendlyApiError(err, 'Could not append row.'));
  }
  return { rowNumber: appendedRowNumber, headers, unknownFields: unknown };
}

async function updateRowByHeaders(sheetId, tabName, rowNumber, valuesObj) {
  const sheets = getSheetsClient();
  if (!rowNumber || rowNumber < 2) throw new Error('row_number must be 2 or greater (row 1 is the header).');
  const headers = await getTabHeaders(sheetId, tabName);
  if (!headers.length) throw new Error(`The "${tabName}" tab has no header row.`);
  const lastCol = colIdxToA1(headers.length - 1);
  const range = `${quoteTab(tabName)}!A${rowNumber}:${lastCol}${rowNumber}`;
  // Read existing row so unmapped cells stay intact.
  let existing = [];
  try {
    const r = await withRetry('values.get update', () => sheets.spreadsheets.values.get({
      spreadsheetId: sheetId, range,
    }));
    existing = (r.data.values && r.data.values[0]) || [];
  } catch (_) { existing = []; }
  const next = new Array(headers.length).fill('');
  for (let i = 0; i < headers.length; i++) next[i] = String(existing[i] != null ? existing[i] : '');
  const headerNorms = headers.map((h) => normalizeHeader(h));
  const unknown = [];
  for (const [k, v] of Object.entries(valuesObj || {})) {
    if (v == null) continue;
    const kn = normalizeHeader(k);
    let idx = headerNorms.indexOf(kn);
    if (idx === -1) idx = headerNorms.findIndex((h) => h.includes(kn) || kn.includes(h));
    if (idx === -1) { unknown.push(k); continue; }
    next[idx] = safeCellValue(v);
  }
  try {
    await withRetry('values.update generic', () => sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [next] },
    }));
  } catch (err) {
    throw new Error(friendlyApiError(err, 'Could not update row.'));
  }
  return { rowNumber, headers, unknownFields: unknown };
}

// --- Auto-provisioning --------------------------------------------------
// "Just make it work" helper: if the user's tab is missing required
// columns, append the missing canonical headers to the right of whatever
// is already there. Pre-existing data and column order are preserved.

const DEFAULT_HEADERS = ['Date', 'Time', 'Location', 'Name', 'Phone', 'Status', 'CreatedAt'];

const DEFAULT_SETTINGS_ROWS = [
  ['Key', 'Value'],
  ['system_prompt', 'You are a friendly booking assistant. Help the user find and book an open slot. Confirm details before booking.'],
  ['booked_response', 'Sorry, that slot is already taken. Here are some other options.'],
  ['confirm_response', 'Confirmed! See you on {date} at {time}.'],
  ['slot_duration', '30 minutes'],
  ['business_hours', '09:00-17:00'],
];

async function provisionMissingColumns(sheetId, schema) {
  const sheets = getSheetsClient();
  const existingHeaders = schema.headers || [];
  const present = new Set(Object.keys(schema.columnMap || {}));
  const wanted = ['date', 'time', 'name', 'location', 'phone', 'status', 'createdAt'];
  // Map canonical field -> nice display header.
  const niceName = {
    date: 'Date', time: 'Time', name: 'Name',
    location: 'Location', phone: 'Phone', status: 'Status', createdAt: 'CreatedAt',
  };
  const toAppend = wanted.filter((f) => !present.has(f)).map((f) => niceName[f]);
  if (toAppend.length === 0) return { added: [] };

  const startCol = colIdxToA1(existingHeaders.length);
  const endCol = colIdxToA1(existingHeaders.length + toAppend.length - 1);
  const range = `${quoteTab(schema.tabName)}!${startCol}1:${endCol}1`;
  try {
    await withRetry('values.update headers', () => sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [toAppend] },
    }));
  } catch (err) {
    throw new Error(friendlyApiError(err, 'Could not write the new column headers.'));
  }
  return { added: toAppend };
}

// If the spreadsheet has no Settings tab, create one and seed it with the
// default rows. Safe to call repeatedly — does nothing if a Settings tab
// already exists.
async function ensureSettingsTab(sheetId) {
  const sheets = getSheetsClient();
  let meta;
  try {
    meta = await withRetry('spreadsheets.get settings', () => sheets.spreadsheets.get({
      spreadsheetId: sheetId, includeGridData: false,
    }));
  } catch (err) {
    throw new Error(friendlyApiError(err, 'Could not open the sheet.'));
  }
  const existing = (meta.data.sheets || []).find((s) => /setting/i.test(s.properties?.title || ''));
  if (existing) return { created: false, tabName: existing.properties.title };

  // Create the tab.
  try {
    await withRetry('batchUpdate addSheet', () => sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: PREFERRED_SETTINGS_TAB } } }],
      },
    }));
  } catch (err) {
    throw new Error(friendlyApiError(err, 'Could not create the Settings tab.'));
  }
  // Seed default rows.
  try {
    await withRetry('values.update settings seed', () => sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${quoteTab(PREFERRED_SETTINGS_TAB)}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: DEFAULT_SETTINGS_ROWS },
    }));
  } catch (err) {
    // Tab was created — even if seeding fails, the user can fill it in.
    console.warn('[sheets] settings seed soft-failed:', err?.message || err);
  }
  return { created: true, tabName: PREFERRED_SETTINGS_TAB };
}

// Human-readable description of what we detected, for UI feedback.
function describeSchema(schema) {
  const cm = schema.columnMap || {};
  const detected = Object.keys(cm)
    .map((f) => `${f} → "${schema.headers[cm[f]]}"`)
    .join(', ');
  return {
    tabName: schema.tabName,
    settingsTabName: schema.settingsTabName,
    detected,
    headers: schema.headers,
    missing: schema.missing,
  };
}

module.exports = {
  PREFERRED_AVAIL_TAB,
  PREFERRED_SETTINGS_TAB,
  HEADER_SYNONYMS,
  getServiceAccountEmail,
  parseSheetId,
  parseSheetGid,
  detectSchema,
  readAvailability,
  readSettings,
  updateBookingRow,
  appendBookingRow,
  isSlotFree,
  findMatchingRow,
  friendlyApiError,
  parseBusinessHours,
  parseTimeToMinutes,
  isWithinBusinessHours,
  describeSchema,
  colIdxToA1,
  quoteTab,
  provisionMissingColumns,
  ensureSettingsTab,
  DEFAULT_HEADERS,
  getSpreadsheetSnapshot,
  getTabHeaders,
  readTabRows,
  appendRowByHeaders,
  updateRowByHeaders,
  setAdminServiceAccountJson,
  getServiceAccountStatus,
};
