import { patientAPI } from '../services/api';

const LOCAL_STORAGE_CACHE_KEY = 'cms_patient_cache_v7';

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
  const area = String(p.area || p.family?.area || p.society || '').trim().toUpperCase();

  // ONLY index patient's OWN searchable properties: name, patientId, phone
  // Exclude family headName so other family members are NEVER matched when searching by patient name!
  return {
    ...p,
    recentVisits: Array.isArray(p.recentVisits) ? p.recentVisits : [],
    _nameUpper: nameUpper,
    _nameWords: nameWords,
    _pid: pid,
    _digits: digits,
    _phone: phone,
    _famId: famId,
    _area: area,
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
        recentVisits: Array.isArray(p.recentVisits) ? p.recentVisits.slice(0, 3) : [],
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
 * Remove a deleted patient from RAM cache and localStorage immediately.
 */
export const removeCachedPatient = (patientId, mongoId = null) => {
  if (!patientId && !mongoId) return;
  patientCache = patientCache.filter((p) => {
    if (patientId && p.patientId === patientId) return false;
    if (mongoId && p._id === mongoId) return false;
    return true;
  });
  if (typeof window !== 'undefined') {
    window.patientCache = patientCache;
    try {
      window.dispatchEvent(new CustomEvent('cms_patient_deleted', { detail: { patientId, mongoId } }));
    } catch (e) {}
  }
  persistCacheToStorage(patientCache);
};

/**
 * Remove all patients belonging to a deleted family from RAM cache and localStorage immediately.
 */
export const removeCachedFamily = (familyId) => {
  if (!familyId) return;
  const famKey = String(familyId).trim();
  patientCache = patientCache.filter((p) => String(p.familyId || p.family?.familyId || '').trim() !== famKey);
  if (typeof window !== 'undefined') {
    window.patientCache = patientCache;
    try {
      window.dispatchEvent(new CustomEvent('cms_patient_deleted', { detail: { familyId: famKey } }));
    } catch (e) {}
  }
  persistCacheToStorage(patientCache);
};

/**
 * Ultra-fast sub-millisecond in-memory search across all preloaded patients.
 * Searches STRICTLY by patient's own name (or phone / patient ID).
 * Never matches family head or other family members.
 * Prioritizes:
 *  1. Exact Full Name Match (p.name === query)
 *  2. Name Prefix (p.name starts with query)
 *  3. Word Prefix / Multi-token Match (each token in patient's name)
 *  4. Patient ID / Phone Match
 */
export const searchPatientsInMemory = (rawQuery, maxResults = 35) => {
  if (!rawQuery || !rawQuery.trim() || !Array.isArray(patientCache) || patientCache.length === 0) {
    return [];
  }

  const query = rawQuery.trim().toUpperCase();
  const tokens = query.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const isPureDigits = /^\d+$/.test(query);
  const isPidQuery = /^(P|PAT)[-\s]*\d+/i.test(query) || /^P\d+$/i.test(query);

  const exactMatches = [];
  const namePrefixMatches = [];
  const nameTokenMatches = [];
  const idOrPhoneMatches = [];

  const len = patientCache.length;
  for (let i = 0; i < len; i++) {
    const p = patientCache[i];
    const nameUpper = p._nameUpper || (p.name || '').toUpperCase();

    if (isPureDigits) {
      // Pure numeric query: match patient phone or patientId digits
      if (p._phone && p._phone.includes(query)) {
        idOrPhoneMatches.push(p);
      } else if (p._digits && p._digits.includes(query)) {
        idOrPhoneMatches.push(p);
      }
      continue;
    }

    if (isPidQuery) {
      // Explicit Patient ID query (P-00001)
      if (p._pid && p._pid.includes(query)) {
        idOrPhoneMatches.push(p);
      }
      continue;
    }

    // --- MUST BE SEARCHED ONLY BY PATIENT'S OWN NAME ---
    // All entered tokens must exist inside patient's own name
    let matchesAllTokens = true;
    for (let t = 0; t < tokens.length; t++) {
      if (!nameUpper.includes(tokens[t])) {
        matchesAllTokens = false;
        break;
      }
    }
    if (!matchesAllTokens) continue;

    // Prioritized Bucketing:
    if (nameUpper === query) {
      exactMatches.push(p);
    } else if (nameUpper.startsWith(query)) {
      namePrefixMatches.push(p);
    } else {
      nameTokenMatches.push(p);
    }
  }

  // Sort within groups: shorter names closer to query length come first
  namePrefixMatches.sort((a, b) => a._nameUpper.length - b._nameUpper.length || a._nameUpper.localeCompare(b._nameUpper));
  nameTokenMatches.sort((a, b) => a._nameUpper.length - b._nameUpper.length || a._nameUpper.localeCompare(b._nameUpper));

  return [...exactMatches, ...namePrefixMatches, ...nameTokenMatches, ...idOrPhoneMatches].slice(0, maxResults);
};

/**
 * Fast in-memory search for unique Families / Family Heads from cached patients.
 */
export const searchFamiliesInMemory = (rawQuery = '', maxResults = 25) => {
  if (!Array.isArray(patientCache) || patientCache.length === 0) return [];
  const query = (rawQuery || '').trim().toUpperCase();
  const tokens = query ? query.split(/\s+/).filter(Boolean) : [];

  const famMap = new Map();
  for (let i = 0; i < patientCache.length; i++) {
    const p = patientCache[i];
    const famId = String(p.familyId || p.family?.familyId || '').trim();
    if (!famId || famId === 'NEW') continue;

    if (!famMap.has(famId)) {
      const headName = String(
        p.family?.headName || (p.isHead ? p.name : '') || ''
      ).trim();
      famMap.set(famId, {
        familyId: famId,
        headName: headName || p.name || 'Family Head',
        society: p.family?.society || p.society || '',
        area: p.family?.area || p.area || '',
        houseNo: p.family?.houseNo || p.houseNo || '',
        phone: p.family?.phone || p.phone || '',
        familyDue: p.family?.familyDue ?? p.totalDue ?? 0,
      });
    } else if (p.isHead && p.name) {
      const existing = famMap.get(famId);
      if (!existing.headName || existing.headName === 'Family Head') {
        existing.headName = p.name;
      }
    }
  }

  const allFamilies = Array.from(famMap.values());
  if (tokens.length === 0) {
    return allFamilies.slice(0, maxResults);
  }

  const matches = allFamilies.filter((fam) => {
    const hay = `${fam.headName} FAM-${fam.familyId} ${fam.familyId} ${fam.phone} ${fam.area} ${fam.society}`.toUpperCase();
    return tokens.every((t) => hay.includes(t));
  });

  matches.sort((a, b) => {
    const aStarts = (a.headName || '').toUpperCase().startsWith(query);
    const bStarts = (b.headName || '').toUpperCase().startsWith(query);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return (a.headName || '').localeCompare(b.headName || '');
  });

  return matches.slice(0, maxResults);
};
