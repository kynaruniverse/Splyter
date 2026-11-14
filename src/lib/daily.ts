// src/lib/daily.ts
import type { Side, Split } from './types'

export type DailyState = {
  today: Split | null
  voted: Side | null
  yesterday: Split | null
  yesterday_results: { a: number; b: number } | null
  next_reveal_at: string // ISO, from the server — never computed client-side
}