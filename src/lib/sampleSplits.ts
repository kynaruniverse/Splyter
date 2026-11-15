export type SampleSplit = {
  id: string
  tag: string
  option_a: string
  option_b: string
}

const prompts: Array<[string, string, string]> = [
  ['Split the bill by what you ordered', 'Split it evenly', 'Money'],
  ['Tell your friend their partner is cheating', 'Say nothing', 'Friendship'],
  ['Take the window seat', 'Give it to them', 'Small stuff'],
  ['Text back straight away', 'Leave it an hour', 'Dating'],
  ['Go home at 11', 'Stay out', 'Nights out'],
]

export const sampleSplits: SampleSplit[] = prompts.map(([a, b, tag], i) => ({
  id: `sample-${i}`,
  option_a: a,
  option_b: b,
  tag,
}))