import { supabase } from './supabase'
import type { FeedSplit, Profile, Side, Tag, VoteResult } from './types'

// Every RPC name and argument key lives here. Matches
// 20261110193500_wave1_schema.sql exactly.
const RPC = {
  getFeed:         { name: 'get_feed',         args: (p: { limit: number }) => ({ p_limit: p.limit }) },
  recordView:      { name: 'record_view',      args: (p: { postId: string }) => ({ p_post_id: p.postId }) },
  recordSkip:      { name: 'record_skip',      args: (p: { postId: string; early: boolean }) => ({ p_post_id: p.postId, p_early: p.early }) },
  castChoice:      { name: 'cast_choice',      args: (p: { cardId: string; side: Side }) => ({ p_card_id: p.cardId, p_side: p.side, p_guess: null }) },
  getSplitResult:  { name: 'get_split_result', args: (p: { cardId: string }) => ({ p_card_id: p.cardId }) },
  createDilemma:   { name: 'create_dilemma',   args: (p: { prompt: string; optionA: string; optionB: string; tagSlug: string; remixOf: string | null }) => ({ p_prompt: p.prompt, p_option_a: p.optionA, p_option_b: p.optionB, p_tag_slug: p.tagSlug, p_remix_of: p.remixOf }) },
  deleteSplit:     { name: 'delete_split',     args: (p: { postId: string }) => ({ p_post_id: p.postId }) },
  reportPost:      { name: 'report_post',      args: (p: { postId: string; reason: string }) => ({ p_post_id: p.postId, p_reason: p.reason }) },
  redeemInvite:    { name: 'redeem_invite',    args: (p: { code: string }) => ({ p_code: p.code }) },
  completeProfile: { name: 'complete_profile', args: (p: { handle: string; displayName: string; avatarColor: string; birthDate: string }) => ({ p_handle: p.handle, p_display_name: p.displayName, p_avatar_color: p.avatarColor, p_birth_date: p.birthDate }) },
  setPrivate:      { name: 'set_private',      args: (p: { isPrivate: boolean }) => ({ p_private: p.isPrivate }) },
  isMember:        { name: 'is_member',        args: () => ({}) },
  authIsAnonymous: { name: 'auth_is_anonymous', args: () => ({}) },
} as const

async function rpc<T>(key: keyof typeof RPC, payload?: any): Promise<T> {
  const { name, args } = RPC[key] as any
  const { data, error } = await supabase.rpc(name, args(payload ?? {}))
  if (error) throw new Error(`${name}: ${error.message}`)
  return data as T
}

function one<T>(v: T | T[] | null): T | null {
  if (v == null) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

// Feed

export async function fetchFeed(limit = 20): Promise<FeedSplit[]> {
  const data = await rpc<FeedSplit[] | null>('getFeed', { limit })
  return data ?? []
}

export async function recordView(postId: string): Promise<void> {
  await rpc<void>('recordView', { postId })
}

export async function recordSkip(postId: string, early: boolean): Promise<void> {
  await rpc<void>('recordSkip', { postId, early })
}

export async function castChoice(cardId: string, side: Side): Promise<VoteResult> {
  const raw = one<{ a_votes: number; b_votes: number; total_votes: number }>(
    await rpc<any>('castChoice', { cardId, side }),
  )
  return raw
    ? { a: raw.a_votes, b: raw.b_votes, total: raw.total_votes, my_side: side }
    : { a: 0, b: 0, total: 0, my_side: side }
}

// Throws 'vote_first' if the caller hasn't voted; we swallow that and return null.
export async function fetchSplitResult(cardId: string): Promise<VoteResult | null> {
  try {
    const raw = one<{ a_votes: number; b_votes: number; total_votes: number; my_side: Side }>(
      await rpc<any>('getSplitResult', { cardId }),
    )
    return raw
      ? { a: raw.a_votes, b: raw.b_votes, total: raw.total_votes, my_side: raw.my_side }
      : null
  } catch {
    return null
  }
}

// Create / delete

export async function createDilemma(input: {
  prompt: string
  option_a: string
  option_b: string
  tag_slug: string
  remix_of?: string | null
}): Promise<string> {
  const id = await rpc<string>('createDilemma', {
    prompt: input.prompt,
    optionA: input.option_a,
    optionB: input.option_b,
    tagSlug: input.tag_slug,
    remixOf: input.remix_of ?? null,
  })
  if (typeof id !== 'string') throw new Error('create_dilemma returned no id')
  return id
}

export async function deleteSplit(postId: string): Promise<void> {
  await rpc<void>('deleteSplit', { postId })
}

// Moderation

export async function reportPost(postId: string, reason: string): Promise<void> {
  await rpc<void>('reportPost', { postId, reason })
}

// Setup / identity

export async function redeemInvite(code: string): Promise<void> {
  await rpc<void>('redeemInvite', { code })
}

export async function completeProfile(input: {
  handle: string
  displayName: string
  avatarColor: string
  birthDate: string
}): Promise<void> {
  await rpc<void>('completeProfile', input)
}

export async function setPrivate(isPrivate: boolean): Promise<void> {
  await rpc<void>('setPrivate', { isPrivate })
}

export async function isMember(): Promise<boolean> {
  return Boolean(await rpc<boolean>('isMember'))
}

export async function isAnonymous(): Promise<boolean> {
  return Boolean(await rpc<boolean>('authIsAnonymous'))
}

// Direct table reads

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, handle, display_name, avatar_color, bio, is_private, created_at')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as Profile) ?? null
}

export async function fetchTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('slug, label, sort_order')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []) as Tag[]
}

export type MySplit = {
  id: string
  title: string
  tag_slug: string
  status: string
  vote_count: number
  created_at: string
}

export async function fetchMySplits(): Promise<MySplit[]> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return []
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, tag_slug, status, vote_count, created_at')
    .eq('creator_id', uid)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as MySplit[]
}

export async function fetchChoiceCount(): Promise<number> {
  const { count, error } = await supabase
    .from('choices')
    .select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}