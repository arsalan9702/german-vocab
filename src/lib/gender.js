// Noun gender from the leading article. Plurals are marked "(pl.)" by the user and get no gender,
// so plural "die" is never read as feminine.
const ARTICLE = /^(der|die|das)\s/i
const PLURAL = /\(pl\.?\)/i

export function genderOf(de) {
  const s = String(de ?? '').trim()
  if (PLURAL.test(s)) return null
  return s.match(ARTICLE)?.[1].toLowerCase() ?? null
}
