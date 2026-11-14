export type Side = 'a' | 'b'

export type Split = {
  id: string
  prompt_a: string
  prompt_b: string
  tags: string[]
  counts_a: number
  counts_b: number
  author_id: string | null
}

export type Results = { a: number; b: number }

export type Profile = {
  id: string
  display_name: string | null
  age_band: '13-17' | '18+' | null
  is_private: boolean
  onboarded_at: string | null
}