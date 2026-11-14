// src/lib/api.ts — replaces the existing file
import { supabase } from './supabase'
import type { Profile, Results, Side, Split } from './types'
import type { DailyState } from './daily'

// ─────────────────────────────────────────────────────────────
// Every RPC name and argument key lives here. Reconcile against the
// migration by editing ONLY this object — all callers follow.
// ─────────────────────────────────────────────────────────────
const RPC = {
  getFeed:         { name: 'get_feed',         args: (p: { limit: number }) => ({ p_limit: p.limit }) },
  getSplit:        { name: 'get_split',        args: (p: { id: string }) => ({ p_id: p.id }) },
  getResults:      { name: 'get_results',      args: (p: { postId: string }) => ({ p_post_id: p.postId }) },
  castVote:        { name: 'cast_vote',        args: (p: { postId: string; choice: Side }) => ({ p_post_id: p.postId, p_choice: p.choice }) },
  recordSkip:      { name: 'record_skip',      args: (p: { postId: string; elapsedMs: number }) => ({ p_post_id: p.postId, p_elapsed_ms: p.elapsedMs }) },
  redeemInvite:    { name: 'redeem_invite',    args: (p: { code: string }) => ({ p_code: p.code }) },
  completeProfile: { name: 'complete_profile', args: (p: { name: string; age: string }) => ({ p_display_name: p.name, p_age_band: p.age }) },
  reportPost:      { name: 'report_post',      args: (p: { postId: string; reason: string }) => ({ p_post_id: p.postId, p_reason: p.reason }) },
  createSplit:     { name: 'create_split',     args: (p: { promptA: string; promptB: string; tag: string }) => ({ p_prompt_a: p.promptA, p_prompt_b: p.promptB, p_tag: p.tag }) },
  deleteSplit:     { name: 'delete_split',     args: (p: { id: string }) => ({ p_id: p.id }) },
  getDailyState:   { name: 'get_daily_state',  args: () => ({}) },
} as const

async function rpc<T>(key: keyof typeof RPC, payload?: any): Promise<T> {
  const { name, args } = RPC[key] as any
  const { data, error } = await supabase.rpc(name, args(payload ?? {}))
  if (error) {
    // Surface the real name so the browser network tab and this error agree.
    throw new Error(`${name}: ${error.message}`)
  }
  return data as T
}

// Normalises either a single object or a one-element array, because
// whether an RPC returns setof or a scalar was one of my guesses.
function one<T>(v: T | T[] | null): T | null {
  if (v == null) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

export async function fetchFeed(limit = 20): Promise<Split[]> {
  const data = await rpc<Split[] | null>('getFeed', { limit })
  return data ?? []
}

export async function fetchSplit(id: string): Promise<Split | null> {
  return one(await rpc<Split | Split[] | null>('getSplit', { id }))
}

export async function fetchResults(postId: string): Promise<Results> {
  // Accepts either {counts_a, counts_b} or {a, b} — both shapes were guessed.
  const raw = one<any>(await rpc<any>('getResults', { postId }))
  return { a: raw?.a ?? raw?.counts_a ?? 0, b: raw?.b ?? raw?.counts_b ?? 0 }
}

export const castVote = (postId: string, choice: Side) =>
  rpc<void>('castVote', { postId, choice })

export const recordSkip = (postId: string, elapsedMs: number) =>
  rpc<void>('recordSkip', { postId, elapsedMs })

export const redeemInvite = (code: string) =>
  rpc<void>('redeemInvite', { code })

export const completeProfile = (name: string, age: '13-17' | '18+') =>
  rpc<void>('completeProfile', { name, age })

export const reportSplit = (postId: string, reason: string) =>
  rpc<void>('reportPost', { postId, reason })

export async function createSplit(input: { prompt_a: string; prompt_b: string; tag: string }): Promise<string> {
  const raw = one<any>(await rpc<any>('createSplit', {
    promptA: input.prompt_a, promptB: input.prompt_b, tag: input.tag,
  }))
  const id = typeof raw === 'string' ? raw : raw?.id
  if (typeof id !== 'string') throw new Error('create_split returned no id')
  return id
}

export const deleteSplit = (id: string) => rpc<void>('deleteSplit', { id })

export const fetchDailyState = () => rpc<DailyState>('getDailyState')

// Direct table reads — these don't use RPCs, so reconcile against the
// column dump (query 2), not the function dump.
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, age_band, is_private, onboarded_at')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as Profile) ?? null
}

export async function fetchMySplits(): Promise<any[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('id, prompt_a, prompt_b, tags, counts_a, counts_b, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function fetchMyChoiceCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('choices')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) throw error
  return count ?? 0
}