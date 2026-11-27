/**
 * Shared Dynamic Age Calculation Helpers
 * - If DOB is provided: calculates exact Years, Months, and Days (e.g., "19Y 2M 12D").
 * - If manual Age is provided without DOB: adds elapsed calendar months since `ageRecordedAt`
 *   so an age saved as 19 becomes "19Y 2M" after 2 months.
 */

export const calculateAgeFromDob = (dobString) => {
  if (!dobString) return '';
  const str = String(dobString).trim();
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const birthDate = ymdMatch
    ? new Date(Number(ymdMatch[1]), Number(ymdMatch[2]) - 1, Number(ymdMatch[3]))
    : new Date(str);
  if (isNaN(birthDate.getTime())) return '';

  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return '0Y 0M 0D';

  return `${years}Y ${months}M ${days}D`;
};

export const calculateContinuousAge = (baseAgeStr, ageRecordedAt = null, dobString = '') => {
  if (dobString && String(dobString).trim()) {
    return calculateAgeFromDob(dobString);
  }

  const raw = String(baseAgeStr || '').trim();
  if (!raw) return '';

  // Parse base years & optional months (e.g., "19" or "19Y 2M" or "6M")
  let baseYears = 0;
  let baseMonths = 0;
  const ymMatch = raw.match(/(\d+)\s*Y(?:ears?)?\s*(?:(\d+)\s*M)?/i);
  const mOnlyMatch = raw.match(/^(\d+)\s*M(?:onths?)?$/i);

  if (mOnlyMatch) {
    baseMonths = parseInt(mOnlyMatch[1], 10) || 0;
  } else if (ymMatch) {
    baseYears = parseInt(ymMatch[1], 10) || 0;
    baseMonths = parseInt(ymMatch[2] || '0', 10) || 0;
  } else {
    const num = parseInt(raw, 10);
    if (isNaN(num)) return raw;
    baseYears = num;
  }

  let elapsedMonths = 0;
  if (ageRecordedAt) {
    const refDate = new Date(ageRecordedAt);
    if (!isNaN(refDate.getTime())) {
      const today = new Date();
      elapsedMonths =
        (today.getFullYear() - refDate.getFullYear()) * 12 +
        (today.getMonth() - refDate.getMonth());
      if (today.getDate() < refDate.getDate()) {
        elapsedMonths -= 1;
      }
      elapsedMonths = Math.max(0, elapsedMonths);
    }
  }

  const totalMonths = baseYears * 12 + baseMonths + elapsedMonths;
  const finalYears = Math.floor(totalMonths / 12);
  const finalMonths = totalMonths % 12;

  return `${finalYears}Y ${finalMonths}M`;
};

export const getPatientDisplayAge = (patient) => {
  if (!patient) return '';
  const dob = patient.dob || '';
  const age = patient.age !== undefined && patient.age !== null ? String(patient.age) : '';
  const recordedAt = patient.ageRecordedAt || patient.createdAt || patient.updatedAt || null;
  return calculateContinuousAge(age, recordedAt, dob);
};

