import webpush from "web-push";
import { getSupabaseAdmin } from "./supabase";

function getWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || "mailto:admin@checkyourdrip.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  return webpush;
}

export type PushPayload = {
  title: string;
  body: string;
  image?: string;
  detectionId?: number;
  url?: string;
};

export async function sendPushToAll(payload: PushPayload): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, subscription");

  if (!subs?.length) return;

  const wp = getWebPush();
  const results = await Promise.allSettled(
    subs.map((row) =>
      wp.sendNotification(
        row.subscription as webpush.PushSubscription,
        JSON.stringify({
          ...payload,
          url: payload.url || process.env.NEXT_PUBLIC_APP_URL || "/",
        })
      )
    )
  );

  // Remove expired / invalid subscriptions
  const staleEndpoints: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const err = result.reason as { statusCode?: number };
      if (err.statusCode === 410 || err.statusCode === 404) {
        staleEndpoints.push(subs[i].endpoint);
      }
    }
  });

  if (staleEndpoints.length) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", staleEndpoints);
  }
}
