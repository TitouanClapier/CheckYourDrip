import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type Detection = {
  id: number;
  detected_at: string;
  object_class: string;
  confidence: number;
  seen: boolean;
  mongo_id: string | null;
  photo_url?: string | null;
  verification?: boolean | null;
};

export type NotificationSettings = {
  id: number;
  email_addresses: string[];
  email_enabled: boolean;
  min_confidence: number;
  updated_at: string;
};

export type PushSubscription = {
  id: number;
  endpoint: string;
  subscription: object;
  created_at: string;
};

/** Client-side Supabase (anon key, used for realtime) */
let _client: ReturnType<typeof createSupabaseClient> | null = null;

export function getSupabaseClient() {
  if (!_client) {
    _client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}

/** Server-side Supabase (service role key, used in API routes) */
export function getSupabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
