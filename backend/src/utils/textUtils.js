export const toUpperTrim = (val) => {
  if (val === undefined || val === null) return '';
  return String(val).trim().toUpperCase();
};

export const toUpperArray = (arr) => {
  if (Array.isArray(arr)) {
    return arr.map((item) => toUpperTrim(item)).filter(Boolean);
  }
  if (typeof arr === 'string' && arr.trim()) {
    return arr
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
  }
  return [];
};

