// Trim, collapse whitespace, normalize unicode (so "ü" typed two ways is the same string).
export const clean = (s) =>
  String(s ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()

// Case-insensitive comparison key for duplicate checks.
export const keyOf = (s) => clean(s).toLocaleLowerCase('de')
// Search key: lowercase, ß as ss, accents and umlauts dropped, so "strasse" finds "Straße".
export const fold = (s) =>
  keyOf(s)
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
