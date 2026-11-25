import { patientAPI } from '../services/api';

const LOCAL_STORAGE_CACHE_KEY = 'cms_patient_cache_v3';

// Index patient for sub-millisecond prefix & multi-token search
const indexPatient = (p) => {
  if (!p) return null;
  const name = String(p.name || p.fullName || '').trim();
  const nameUpper = name.toUpperCase();
  const nameWords = nameUpper.split(/\s+/).filter(Boolean);
  const pid = String(p.patientId || p._id || '').trim().toUpperCase();
  const digits = pid.replace(/\D/g, '');
  const phone = String(p.phone || '').trim().toUpperCase();
  const famId = String(p.familyId || p.family?.familyId || '').trim().toUpperCase();
  const headName = String(p.family?.headName || p.headName || '').trim().toUpperCase();
  const area = String(p.area || p.family?.area || '').trim().toUpperCase();
  const society = String(p.society || p.family?.society || '').trim().toUpperCase();

  const blob = `${nameUpper} ${pid} ${digits} ${phone} ${famId} ${headName} ${area} ${society}`;

  return {
    ...p,
    _nameUpper: nameUpper,
    _nameWords: nameWords,
    _pid: pid,
    _digits: digits,
    _blob: blob,
  };
};

// Initial load from localStorage for instant 0ms startup without waiting for network
const loadInitialCache = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(indexPatient).filter(Boolean);
        }
      }
    }
  } catch (err) {
    console.warn('Could not read cached patients from storage:', err);
  }
  return [];
};

// Global in-memory cache of clinic patients
export let patientCache = loadInitialCache();
let isPreloading = false;
let lastPreloadTime = 0;

if (typeof window !== 'undefined') {
  window.patientCache = patientCache;
}

const persistCacheToStorage = (list) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Store essential fields to keep storage compact & fast
      const compactList = list.slice(0, 3000).map((p) => ({
        _id: p._id,
        patientId: p.patientId,
        familyId: p.familyId,
        name: p.name,
        age: p.age,
        gender: p.gender,
        phone: p.phone,
        society: p.society,
        area: p.area,
        bloodGroup: p.bloodGroup,
        allergies: p.allergies,
        relation: p.relation,
        isHead: p.isHead,
        totalDue: p.totalDue,
        deposit: p.deposit,
        family: p.family ? {
          familyId: p.family.familyId,
          headName: p.family.headName,
          society: p.family.society,
          area: p.family.area,
          phone: p.family.phone,
          familyDue: p.family.familyDue,
          familyDeposit: p.family.familyDeposit,
        } : null,
      }));
      window.localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(compactList));
    }
  } catch (err) {
    console.warn('Could not persist patient cache to localStorage:', err);
  }
};

/**
 * Preload all clinic patients from backend into RAM.
 * Fetches up to 10,000 records in one fast lean call.
 */
export const preloadPatients = async (force = false) => {
  const now = Date.now();
  // Don't refetch if fetched in the last 20 seconds unless forced
  if (!force && patientCache.length > 0 && now - lastPreloadTime < 20000) {
    return patientCache;
  }
  if (isPreloading) {
    return patientCache;
  }

  isPreloading = true;
  try {
    const res = await patientAPI.getAll('');
    if (res?.success && Array.isArray(res.data)) {
      const indexed = res.data.map(indexPatient).filter(Boolean);
      patientCache = indexed;
      lastPreloadTime = Date.now();

      if (typeof window !== 'undefined') {
        window.patientCache = patientCache;
      }
      persistCacheToStorage(patientCache);
      return patientCache;
    }
  } catch (err) {
    console.warn('Could not preload patient cache from API:', err);
  } finally {
    isPreloading = false;
  }
  return patientCache;
};

/**
 * Upsert patient in the live memory cache and storage immediately.
 */
export const updateCachedPatient = (patient) => {
  if (!patient || (!patient.patientId && !patient._id)) return;
  const pid = patient.patientId || patient._id;
  const indexed = indexPatient(patient);
  if (!indexed) return;

  const idx = patientCache.findIndex((p) => (p.patientId || p._id) === pid);
  if (idx !== -1) {
    patientCache[idx] = { ...patientCache[idx], ...indexed };
  } else {
    patientCache.unshift(indexed);
  }

  if (typeof window !== 'undefined') {
    window.patientCache = patientCache;
  }
  persistCacheToStorage(patientCache);
};

/**
 * Ultra-fast sub-millisecond in-memory search across all preloaded patients.
 * Prioritizes:
 *  1. Exact Name Prefix (starts with query)
 *  2. Word Prefix (surname / middle name starts with query)
 *  3. Patient ID / Digit match
 *  4. Full Token contains match
 */
export const searchPatientsInMemory = (rawQuery, maxResults = 35) => {
  if (!rawQuery || !rawQuery.trim() || !Array.isArray(patientCache) || patientCache.length === 0) {
    return [];
  }

  const query = rawQuery.trim().toUpperCase();
  const tokens = query.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const firstToken = tokens[0];
  const exactPrefixMatches = [];
  const wordPrefixMatches = [];
  const idMatches = [];
  const otherMatches = [];

  const len = patientCache.length;
  for (let i = 0; i < len; i++) {
    const p = patientCache[i];
    const nameUpper = p._nameUpper || (p.name || '').toUpperCase();
    const blob = p._blob || `${nameUpper} ${(p.patientId || '')} ${(p.phone || '')}`;

    // Fast check: must contain all tokens
    let matchesAll = true;
    for (let t = 0; t < tokens.length; t++) {
      if (!blob.includes(tokens[t])) {
        matchesAll = false;
        break;
      }
    }
    if (!matchesAll) continue;

    // Prioritized Bucketing
    if (nameUpper.startsWith(query)) {
      exactPrefixMatches.push(p);
    } else if (p._nameWords && p._nameWords.some((w) => w.startsWith(firstToken))) {
      wordPrefixMatches.push(p);
    } else if (p._pid && (p._pid.includes(query) || (p._digits && p._digits.startsWith(query)))) {
      idMatches.push(p);
    } else {
      otherMatches.push(p);
    }

    // Fast breakout if we have enough exact & word prefix matches
    if (exactPrefixMatches.length + wordPrefixMatches.length >= maxResults * 1.5) {
      break;
    }
  }

  return [...exactPrefixMatches, ...wordPrefixMatches, ...idMatches, ...otherMatches].slice(0, maxResults);
};
