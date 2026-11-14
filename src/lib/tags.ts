// The 8 fixed tags. Replace the placeholders in splyter-backend seed.sql
// with exactly these strings, in this order, so the DB constraint,
// the Create chips and the feed filters can't drift apart.
export const TAGS = [
  'Money',
  'Friendship',
  'Dating',
  'Family',
  'Work',
  'Nights out',
  'Small stuff',
  'Social media',
] as const

export type Tag = (typeof TAGS)[number]

// Character limits. The spec has its own numbers; these are stand-ins
// used by the counter and client validation. Match them to the spec
// and the DB check constraint before launch.
export const LIMITS = { prompt: 120, displayName: 24 } as const