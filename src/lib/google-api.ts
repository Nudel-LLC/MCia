/**
 * Google API client for Gmail and Calendar operations
 * Uses REST API directly (no SDK dependency for Cloudflare Workers compatibility)
 */

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const CALENDAR_BASE =
  "https://www.googleapis.com/calendar/v3/calendars/primary";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function googleFetch<T = any>(
  url: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google API error (${response.status}): ${error}`);
  }

  return response.json() as Promise<T>;
}

// ========== Gmail API ==========

export async function getGmailHistory(
  accessToken: string,
  startHistoryId: string
) {
  return googleFetch(
    `${GMAIL_BASE}/history?startHistoryId=${startHistoryId}&historyTypes=messageAdded&labelId=INBOX`,
    accessToken
  );
}

export async function getGmailMessage(
  accessToken: string,
  messageId: string
) {
  return googleFetch(
    `${GMAIL_BASE}/messages/${messageId}?format=full`,
    accessToken
  );
}

export async function createGmailDraft(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  trackingTag: string
) {
  // Append hidden tracking tag to the body
  const bodyWithTracking = `${body}\n<!-- mcia:tracking_id:${trackingTag} -->`;

  // Create RFC 2822 message
  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/html; charset=utf-8",
    "",
    bodyWithTracking,
  ].join("\r\n");

  const encodedMessage = btoa(
    unescape(encodeURIComponent(message))
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return googleFetch(`${GMAIL_BASE}/drafts`, accessToken, {
    method: "POST",
    body: JSON.stringify({
      message: { raw: encodedMessage },
    }),
  });
}

export async function getSentMessages(
  accessToken: string,
  query: string
) {
  return googleFetch(
    `${GMAIL_BASE}/messages?q=${encodeURIComponent(query)}&labelIds=SENT&maxResults=10`,
    accessToken
  );
}

export async function setupGmailWatch(
  accessToken: string,
  topicName: string
) {
  return googleFetch(`${GMAIL_BASE}/watch`, accessToken, {
    method: "POST",
    body: JSON.stringify({
      topicName,
      labelIds: ["INBOX", "SENT"],
    }),
  });
}

// ========== Google Calendar API ==========

export async function getCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
) {
  const params = new URLSearchParams({
    timeMin: new Date(timeMin).toISOString(),
    timeMax: new Date(timeMax).toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  return googleFetch(
    `${CALENDAR_BASE}/events?${params}`,
    accessToken
  );
}

export async function createCalendarEvent(
  accessToken: string,
  summary: string,
  startDate: string,
  endDate: string,
  description: string,
  colorId: string
) {
  // Calculate the day after endDate for all-day events (exclusive end)
  const endDateObj = new Date(endDate);
  endDateObj.setDate(endDateObj.getDate() + 1);
  const exclusiveEnd = endDateObj.toISOString().split("T")[0];

  return googleFetch(`${CALENDAR_BASE}/events`, accessToken, {
    method: "POST",
    body: JSON.stringify({
      summary,
      description,
      start: { date: startDate },
      end: { date: exclusiveEnd },
      colorId,
    }),
  });
}

export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  updates: {
    summary?: string;
    colorId?: string;
    description?: string;
  }
) {
  return googleFetch(
    `${CALENDAR_BASE}/events/${eventId}`,
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    }
  );
}

export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
) {
  const response = await fetch(
    `${CALENDAR_BASE}/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(`Delete calendar event failed: ${response.status}`);
  }
}

// ========== Token Management ==========

export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return response.json() as Promise<{ access_token: string; expires_in: number }>;
}
