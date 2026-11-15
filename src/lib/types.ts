export type Side = 'a' | 'b'

// Matches get_feed(...) columns exactly.
export type FeedSplit = {
  post_id: string
  card_id: string
  creator_id: string
  creator_handle: string | null
  prompt: string
  option_a: string
  option_b: string
  tag_slug: string
  remix_of_post_id: string | null
  created_at: string
  score: number
}

// Matches cast_choice(...) and get_split_result(...) columns exactly.
export type VoteResult = {
  a: number
  b: number
  total: number
  my_side?: Side
}

export type Profile = {
  id: string
  handle: string | null
  display_name: string | null
  avatar_color: string | null
  bio: string | null
  is_private: boolean
  created_at: string
}

export type Tag = {
  slug: string
  label: string
  sort_order: number
}