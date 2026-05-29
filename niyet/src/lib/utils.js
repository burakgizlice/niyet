/**
 * True when `str` is exactly one grapheme cluster (one user-perceived emoji).
 *
 * Uses Intl.Segmenter so multi-codepoint emoji collapse to a single grapheme:
 * 🕌 (one codepoint), 🇹🇷 (two regional-indicator codepoints), and ZWJ
 * sequences all count as one. Falls back to a 1–8 char length check on engines
 * without Intl.Segmenter (Safari < 16.4).
 *
 * @param {string} str
 * @returns {boolean}
 */
export function isOneEmoji(str) {
  const trimmed = str.trim()
  if (trimmed.length === 0) return false
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const segments = [...new Intl.Segmenter().segment(trimmed)]
    return segments.length === 1
  }
  return trimmed.length <= 8
}
