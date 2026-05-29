/** @typedef {{ id: string, name: string, emoji: string, steps: string[], position: number, is_default: boolean }} Chain */

/**
 * Block 12: authoritative in-memory seed for the 7 default chains (PRD §3.3).
 *
 * The `id` values are fixed UUIDs locked by decision C1 — Blocks 13 (CRUD), 14
 * (localStorage dedup key), and 16/18 (Supabase seed) reuse these exact strings
 * verbatim. Never regenerate them. Frozen so a stray runtime mutation can't drift
 * the seed out from under the persistence layers that key off it.
 *
 * @type {readonly Chain[]}
 */
export const DEFAULT_CHAINS = Object.freeze([
  {
    id: 'b89e0940-9583-4803-9210-d73924e6cfa4',
    name: 'Namaz Hazırlığı',
    emoji: '🕌',
    steps: [
      'banyoya git (abdest için)',
      'abdest al',
      'odana su getir',
      'su iç',
      'seccadenin önünde dur',
    ],
    position: 0,
    is_default: true,
  },
  {
    id: '16064f10-a06a-4945-8340-5d0277ebe288',
    name: 'Odak Bloğu',
    emoji: '🔬',
    steps: [
      'zamanlayıcıyı aç',
      '15 dk başlat',
      'proje notlarını aç',
      'sadece ilk sayfayı oku',
      'tek bir iş seç',
    ],
    position: 1,
    is_default: true,
  },
  {
    id: '17d995ea-0b2f-4110-b3c5-8ff06778a4bb',
    name: 'Sabah Demiri',
    emoji: '☀️',
    steps: [
      'yatakta doğrul',
      'ayaklarını yere koy',
      'ayağa kalk',
      'banyoya yürü',
      'yüzünü soğuk suyla yıka',
    ],
    position: 2,
    is_default: true,
  },
  {
    id: 'f905b229-be82-43c5-a267-6f9c38d5c038',
    name: 'Abdest',
    emoji: '💧',
    steps: [
      'elleri yıka',
      'ağza su ver',
      'buruna su ver',
      'yüzü yıka',
      'kolları yıka',
      'başı mesh et',
      'ayakları yıka',
    ],
    position: 3,
    is_default: true,
  },
  {
    id: 'c1ba5c76-b02b-4f5b-bd85-cfe11ab91b1f',
    name: 'Uyku Hazırlığı',
    emoji: '🌙',
    steps: ['telefonu bırak', 'diş fırçala', 'ışıkları kapat', 'yatağa gir'],
    position: 4,
    is_default: true,
  },
  {
    id: '3a519d0d-f060-4f1b-be5f-efec4325610a',
    name: 'Evi Topla',
    emoji: '🧹',
    steps: ['bir yüzeyi temizle', 'çöpü topla', 'bulaşığı koy', 'tek bir çeki düzen'],
    position: 5,
    is_default: true,
  },
  {
    id: '72990e01-d127-410e-88cd-f0c2e3b9edc0',
    name: 'Güne Başlama',
    emoji: '☕',
    steps: ['su iç', 'bugünün tek önceliğini seç', 'ilk küçük adımı at'],
    position: 6,
    is_default: true,
  },
])
