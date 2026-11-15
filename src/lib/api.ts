import { supabase } from './supabase';
import type { Side } from '../gesture/swipe-engine';

export type { Side };

export interface FeedItem {
  post_id: string;
  card_id: string;
  creator_id: string;
  creator_handle: string | null;
  prompt: string;
  option_a: string;
  option_b: string;
  tag_slug: string;
  remix_of_post_id: string | null;
  created_at: string;
  score: number;
}

export interface SplitResult {
  a_votes: number;
  b_votes: number;
  total_votes: number;
  my_side?: Side;
}

export interface FriendChoice {
  friend_id: string;
  friend_handle: string | null;
  friend_color: string | null;
  friend_side: Side;
}

export interface Tag {
  slug: string;
  label: string;
}

export interface MyProfile {
  handle: string | null;
  display_name: string | null;
  avatar_color: string | null;
  is_private: boolean;
  inviteRedeemed: boolean;
}

export interface MySplit {
  id: string;
  title: string;
  status: 'published' | 'hidden' | 'deleted';
  vote_count: number;
  skip_count: number;
  remix_count: number;
  created_at: string;
}

/** Messages for the short error codes raised by the database functions. */
const MESSAGES: Record<string, string> = {
  sign_in_required: 'Please sign in first.',
  not_a_member: 'Finish setting up your account to do that.',
  invalid_invite: "That invite code isn't valid or has been used up.",
  invalid_handle: 'Handles are 3-20 characters: lowercase letters, numbers and underscores.',
  handle_taken: 'That handle is taken. Try another.',
  invalid_birth_date: 'Please enter a valid date of birth.',
  too_young: 'Splyter is for people aged 13 and over.',
  already_completed: 'Your profile is already set up.',
  invalid_profile: "Something in your profile isn't valid.",
  invalid_length: 'The prompt can be up to 160 characters and each option up to 60.',
  invalid_tag: 'Pick one of the tags.',
  blocked_content: "That text isn't allowed on Splyter.",
  rate_limited: "You're going too fast. Try again in a bit.",
  invalid_remix: "That Split can't be remixed.",
  own_split: "You can't vote on your own Split.",
  vote_first: 'Make your choice to see the result.',
  not_found: "We couldn't find that.",
  minor_must_stay_private: 'Accounts under 18 stay private.',
  invalid_reason: 'Pick a reason.',
};

export class ApiError extends Error {
  readonly code: string;
  /** The untouched message from the database, for debugging. */
  readonly raw: string;
  constructor(code: string, raw: string) {
    super(MESSAGES[code] ?? 'Something went wrong. Please try again.');
    this.code = code;
    this.raw = raw;
  }
}

function toApiError(message: string): ApiError {
  const code = message in MESSAGES ? message : 'unknown';
  return new ApiError(code, message);
}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw toApiError(error.message);
  return data as T;
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return 'Something went wrong. Please try again.';
}

export const api = {
  feed: (limit = 20) => rpc<FeedItem[]>('get_feed', { p_limit: limit }),

  recordView: (postId: string) => rpc<void>('record_view', { p_post_id: postId }),
  recordSkip: (postId: string, early: boolean) => rpc<void>('record_skip', { p_post_id: postId, p_early: early }),

  async castChoice(cardId: string, side: Side): Promise<SplitResult> {
    const rows = await rpc<SplitResult[]>('cast_choice', { p_card_id: cardId, p_side: side, p_guess: null });
    return rows[0];
  },
  friendChoices: (cardId: string) => rpc<FriendChoice[]>('get_friend_choices', { p_card_id: cardId }),

  redeemInvite: (code: string) => rpc<void>('redeem_invite', { p_code: code.trim() }),
  completeProfile: (args: { handle: string; displayName: string; avatarColor: string; birthDate: string }) =>
    rpc<void>('complete_profile', {
      p_handle: args.handle,
      p_display_name: args.displayName,
      p_avatar_color: args.avatarColor,
      p_birth_date: args.birthDate,
    }),

  createDilemma: (args: { prompt: string; a: string; b: string; tag: string; remixOf?: string | null }) =>
    rpc<string>('create_dilemma', {
      p_prompt: args.prompt,
      p_option_a: args.a,
      p_option_b: args.b,
      p_tag_slug: args.tag,
      p_remix_of: args.remixOf ?? null,
    }),
  deleteSplit: (postId: string) => rpc<void>('delete_split', { p_post_id: postId }),
  reportPost: (postId: string, reason: string) => rpc<void>('report_post', { p_post_id: postId, p_reason: reason }),

  async follow(followeeId: string, myId: string): Promise<void> {
    const { error } = await supabase.from('follows').insert({ follower_id: myId, followee_id: followeeId });
    // 23505 = already following, which is fine.
    if (error && error.code !== '23505') throw toApiError(error.message.includes('row-level security') ? 'not_a_member' : error.message);
  },

  async tags(): Promise<Tag[]> {
    const { data, error } = await supabase.from('tags').select('slug,label').order('sort_order');
    if (error) throw toApiError(error.message);
    return data as Tag[];
  },

  async myProfile(uid: string): Promise<MyProfile> {
    const [p, priv] = await Promise.all([
      supabase.from('profiles').select('handle,display_name,avatar_color,is_private').eq('id', uid).single(),
      supabase.from('profile_private').select('invite_redeemed_at').eq('user_id', uid).single(),
    ]);
    if (p.error) throw toApiError(p.error.message);
    if (priv.error) throw toApiError(priv.error.message);
    return { ...p.data, inviteRedeemed: !!priv.data.invite_redeemed_at } as MyProfile;
  },

  /** How many choices the signed-in (or anonymous) user has made. Drives onboarding progress. */
  async choiceCount(): Promise<number> {
    const { count, error } = await supabase.from('choices').select('id', { count: 'exact', head: true });
    if (error) throw toApiError(error.message);
    return count ?? 0;
  },

  async mySplits(uid: string): Promise<MySplit[]> {
    const { data, error } = await supabase
      .from('posts')
      .select('id,title,status,vote_count,skip_count,remix_count,created_at')
      .eq('creator_id', uid)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });
    if (error) throw toApiError(error.message);
    return data as MySplit[];
  },
};
