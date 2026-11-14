import type { Split } from './types'

// Onboarding only. Not from the database, no counts, never shown as metrics.
const prompts: Array<[string, string, string]> = [
  ['Split the bill by what you ordered', 'Split it evenly', 'Money'],
  ['Tell your friend their partner is cheating', 'Say nothing', 'Friendship'],
  ['Take the window seat', 'Give it to them', 'Small stuff'],
  ['Text back straight away', 'Leave it an hour', 'Dating'],
  ['Go home at 11', 'Stay out', 'Nights out'],
]

export const sampleSplits: Split[] = prompts.map(([a, b, tag], i) => ({
  id: `sample-${i}`,
  prompt_a: a,
  prompt_b: b,
  tags: [tag],
  counts_a: 0,
  counts_b: 0,
  author_id: null,
}))