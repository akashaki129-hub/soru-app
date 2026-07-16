import { createClient } from "npm:@supabase/supabase-js@2";

type NotificationEvent = {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  email_status: "pending" | "sent" | "failed";
  whatsapp_status: "pending" | "sent" | "failed";
  attempts: number;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret",
};

function env(name: string) {
  return Deno.env.get(name)?.trim() || "";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readable(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => readable(item)).join(", ");
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).replaceAll("_", " ");
}

function eventTitle(eventType: string) {
  const titles: Record<string, string> = {
    chef_enrollment: "New chef enrollment",
    customer_enrollment: "New customer enrollment",
    waitlist_entry: "New Soru waitlist entry",
    market_feedback: "New market feedback",
    daily_visit_summary: "Soru daily visitor summary",
  };
  return titles[eventType] || "New Soru update";
}

function formatEvent(event: NotificationEvent) {
  const title = eventTitle(event.event_type);
  const payload = event.payload;

  if (event.event_type === "daily_visit_summary") {
    const topPages = Array.isArray(payload.top_pages)
      ? payload.top_pages
          .map((page) => {
            const item = page as { path?: string; views?: number };
            return `${item.path || "/"}: ${item.views || 0}`;
          })
          .join("\n")
      : "No page views";
    const text = [
      `Soru visitor summary · ${readable(payload.summary_date)}`,
      "",
      `Unique visitors: ${readable(payload.unique_visitors)}`,
      `Visits/sessions: ${readable(payload.sessions)}`,
      `Page views: ${readable(payload.page_views)}`,
      "",
      "Top pages:",
      topPages,
      "",
      `Customer enrollments: ${readable(payload.customer_enrollments)}`,
      `Chef enrollments: ${readable(payload.chef_enrollments)}`,
      `Waitlist entries: ${readable(payload.waitlist_entries)}`,
      `Market feedback: ${readable(payload.market_feedback)}`,
    ].join("\n");
    return { title: `${title} · ${readable(payload.summary_date)}`, text };
  }

  const preferredOrder = [
    "name",
    "full_name",
    "audience",
    "role",
    "preferred_service",
    "city",
    "email",
    "phone",
    "contact",
    "statements",
    "comments",
  ];
  const lines = preferredOrder
    .filter((key) => payload[key] !== undefined)
    .map((key) => `${key.replaceAll("_", " ")}: ${readable(payload[key])}`);
  return { title, text: [title, "", ...lines].join("\n") };
}

async function sendEmail(event: NotificationEvent, title: string, text: string) {
  const apiKey = env("RESEND_API_KEY");
  const to = env("SORU_ALERT_EMAIL");
  const from = env("SORU_ALERT_FROM") || "Soru Alerts <onboarding@resend.dev>";
  if (!apiKey || !to) return { configured: false, error: "Email provider is not configured" };

  const html = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#1b1a17">
    <div style="background:#f5b51b;padding:18px 24px;border-radius:16px 16px 0 0;font-weight:700">Soru</div>
    <div style="padding:24px;border:1px solid #e8e1d5;border-top:0;border-radius:0 0 16px 16px">
      <h2 style="margin:0 0 18px">${escapeHtml(title)}</h2>
      <pre style="white-space:pre-wrap;font:14px/1.65 Arial,sans-serif;margin:0">${escapeHtml(text)}</pre>
      <p style="margin:24px 0 0;color:#777;font-size:12px">Private Soru owner notification · Event ${event.id}</p>
    </div>
  </div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `soru-${event.id}-email`,
    },
    body: JSON.stringify({ from, to: [to], subject: title, text, html }),
  });
  if (!response.ok) {
    const detail = await response.text();
    return { configured: true, error: `Resend ${response.status}: ${detail.slice(0, 400)}` };
  }
  return { configured: true, error: "" };
}

async function sendWhatsapp(event: NotificationEvent, text: string) {
  const accountSid = env("TWILIO_ACCOUNT_SID");
  const authToken = env("TWILIO_AUTH_TOKEN");
  const from = env("TWILIO_WHATSAPP_FROM");
  const to = env("SORU_ALERT_WHATSAPP_TO");
  const contentSid = env("TWILIO_CONTENT_SID");
  if (!accountSid || !authToken || !from || !to) {
    return { configured: false, error: "WhatsApp provider is not configured" };
  }

  const body = new URLSearchParams({
    From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    To: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
  });
  if (contentSid) {
    body.set("ContentSid", contentSid);
    body.set("ContentVariables", JSON.stringify({ "1": text.slice(0, 1500) }));
  } else {
    body.set("Body", text.slice(0, 1500));
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    return { configured: true, error: `Twilio ${response.status}: ${detail.slice(0, 400)}` };
  }
  return { configured: true, error: "" };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  const cronSecret = env("SORU_CRON_SECRET");
  if (!cronSecret || request.headers.get("x-cron-secret") !== cronSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const emailConfigured = Boolean(env("RESEND_API_KEY") && env("SORU_ALERT_EMAIL"));
  const whatsappConfigured = Boolean(
    env("TWILIO_ACCOUNT_SID") &&
    env("TWILIO_AUTH_TOKEN") &&
    env("TWILIO_WHATSAPP_FROM") &&
    env("SORU_ALERT_WHATSAPP_TO"),
  );
  if (!emailConfigured && !whatsappConfigured) {
    return Response.json(
      { error: "Notification providers are not configured" },
      { status: 503, headers: corsHeaders },
    );
  }

  const supabaseUrl = env("SUPABASE_URL");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json(
      { error: "Supabase service credentials are unavailable" },
      { status: 500, headers: corsHeaders },
    );
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("notification_events")
    .select("id,event_type,payload,email_status,whatsapp_status,attempts")
    .is("processed_at", null)
    .lte("next_attempt_at", new Date().toISOString())
    .lt("attempts", 20)
    .order("created_at", { ascending: true })
    .limit(20);
  if (error) {
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }

  const results: Array<Record<string, unknown>> = [];
  for (const event of (data || []) as NotificationEvent[]) {
    const formatted = formatEvent(event);
    let emailStatus = event.email_status;
    let whatsappStatus = event.whatsapp_status;
    const errors: string[] = [];
    let attempted = false;

    if (emailStatus !== "sent") {
      const result = await sendEmail(event, formatted.title, formatted.text);
      if (result.configured) attempted = true;
      if (result.error) errors.push(result.error);
      else emailStatus = "sent";
    }
    if (whatsappStatus !== "sent") {
      const result = await sendWhatsapp(event, formatted.text);
      if (result.configured) attempted = true;
      if (result.error) errors.push(result.error);
      else whatsappStatus = "sent";
    }

    const complete = emailStatus === "sent" && whatsappStatus === "sent";
    const attempts = event.attempts + (attempted && errors.length ? 1 : 0);
    const delayMinutes = errors.some((message) => message.includes("not configured"))
      ? 15
      : Math.min(360, Math.max(5, 2 ** attempts * 5));
    const nextAttemptAt = new Date(Date.now() + delayMinutes * 60_000).toISOString();
    const { error: updateError } = await supabase
      .from("notification_events")
      .update({
        email_status: emailStatus,
        whatsapp_status: whatsappStatus,
        attempts,
        next_attempt_at: nextAttemptAt,
        processed_at: complete ? new Date().toISOString() : null,
        last_error: errors.length ? errors.join(" | ").slice(0, 1500) : null,
      })
      .eq("id", event.id);
    results.push({ id: event.id, complete, errors, updateError: updateError?.message || null });
  }

  return Response.json(
    {
      processed: results.length,
      providers: { email: emailConfigured, whatsapp: whatsappConfigured },
      results,
    },
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
