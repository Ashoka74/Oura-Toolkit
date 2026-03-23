#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const OURA_API_BASE = "https://api.ouraring.com/v2/usercollection";
const OURA_WEBHOOK_BASE = "https://api.ouraring.com/v2/webhook/subscription";

function getAccessToken(): string {
  const token = process.env.OURA_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "OURA_ACCESS_TOKEN environment variable is required. " +
        "Get your token from https://cloud.ouraring.com/personal-access-tokens"
    );
  }
  return token;
}

async function ouraRequest(
  path: string,
  params?: Record<string, string | undefined>,
  method: string = "GET",
  body?: unknown
): Promise<unknown> {
  const token = getAccessToken();
  const url = new URL(path);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Oura API error (${response.status}): ${errorText}`
    );
  }

  if (response.status === 204) {
    return { success: true };
  }

  return response.json();
}

// Date range parameters shared by most endpoints
const dateRangeParams = {
  start_date: z
    .string()
    .optional()
    .describe("Start date in YYYY-MM-DD format"),
  end_date: z
    .string()
    .optional()
    .describe("End date in YYYY-MM-DD format"),
};

// Datetime range parameters for heart rate
const datetimeRangeParams = {
  start_datetime: z
    .string()
    .optional()
    .describe("Start datetime in ISO 8601 format (e.g. 2024-01-01T00:00:00+00:00)"),
  end_datetime: z
    .string()
    .optional()
    .describe("End datetime in ISO 8601 format (e.g. 2024-01-02T00:00:00+00:00)"),
};

// Document ID parameter for single-document endpoints
const documentIdParam = {
  document_id: z
    .string()
    .describe("The document ID to retrieve a specific record"),
};

// Helper to build collection or single-doc tool
function collectionUrl(endpoint: string, documentId?: string): string {
  if (documentId) {
    return `${OURA_API_BASE}/${endpoint}/${documentId}`;
  }
  return `${OURA_API_BASE}/${endpoint}`;
}

// Create server
const server = new McpServer({
  name: "oura-mcp-server",
  version: "1.0.0",
});

// ─── Personal Info ───────────────────────────────────────────────────────────

server.tool(
  "get_personal_info",
  "Get the user's personal information including age, weight, height, email, and biological sex",
  {},
  async () => {
    const data = await ouraRequest(`${OURA_API_BASE}/personal_info`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ─── Daily Activity ──────────────────────────────────────────────────────────

server.tool(
  "get_daily_activity",
  "Get daily activity summaries including steps, calories, MET minutes, and movement data for a date range",
  dateRangeParams,
  async (params) => {
    const data = await ouraRequest(collectionUrl("daily_activity"), params);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_daily_activity_by_id",
  "Get a specific daily activity document by its ID",
  documentIdParam,
  async ({ document_id }) => {
    const data = await ouraRequest(
      collectionUrl("daily_activity", document_id)
    );
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ─── Daily Readiness ─────────────────────────────────────────────────────────

server.tool(
  "get_daily_readiness",
  "Get daily readiness scores including HRV balance, body temperature, and recovery index for a date range",
  dateRangeParams,
  async (params) => {
    const data = await ouraRequest(collectionUrl("daily_readiness"), params);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_daily_readiness_by_id",
  "Get a specific daily readiness document by its ID",
  documentIdParam,
  async ({ document_id }) => {
    const data = await ouraRequest(
      collectionUrl("daily_readiness", document_id)
    );
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ─── Daily Sleep ─────────────────────────────────────────────────────────────

server.tool(
  "get_daily_sleep",
  "Get daily sleep score summaries including sleep score contributors for a date range",
  dateRangeParams,
  async (params) => {
    const data = await ouraRequest(collectionUrl("daily_sleep"), params);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_daily_sleep_by_id",
  "Get a specific daily sleep document by its ID",
  documentIdParam,
  async ({ document_id }) => {
    const data = await ouraRequest(
      collectionUrl("daily_sleep", document_id)
    );
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ─── Sleep (Detailed periods) ────────────────────────────────────────────────

server.tool(
  "get_sleep",
  "Get detailed sleep period data including sleep stages (deep, REM, light), HR, HRV, movement, and timing for a date range",
  dateRangeParams,
  async (params) => {
    const data = await ouraRequest(collectionUrl("sleep"), params);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_sleep_by_id",
  "Get a specific sleep period document by its ID",
  documentIdParam,
  async ({ document_id }) => {
    const data = await ouraRequest(collectionUrl("sleep", document_id));
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ─── Sleep Time (Bedtime recommendation) ─────────────────────────────────────

server.tool(
  "get_sleep_time",
  "Get optimal bedtime window recommendations for a date range",
  dateRangeParams,
  async (params) => {
    const data = await ouraRequest(collectionUrl("sleep_time"), params);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_sleep_time_by_id",
  "Get a specific sleep time recommendation by its document ID",
  documentIdParam,
  async ({ document_id }) => {
    const data = await ouraRequest(
      collectionUrl("sleep_time", document_id)
    );
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ─── Heart Rate ──────────────────────────────────────────────────────────────

server.tool(
  "get_heart_rate",
  "Get heart rate time-series data (5-minute intervals) for a datetime range. Uses datetime (not date) parameters.",
  datetimeRangeParams,
  async (params) => {
    const data = await ouraRequest(
      `${OURA_API_BASE}/heartrate`,
      params
    );
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ─── Daily SpO2 ──────────────────────────────────────────────────────────────

server.tool(
  "get_daily_spo2",
  "Get daily blood oxygen saturation (SpO2) averages for a date range",
  dateRangeParams,
  async (params) => {
    const data = await ouraRequest(collectionUrl("daily_spo2"), params);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_daily_spo2_by_id",
  "Get a specific daily SpO2 document by its ID",
  documentIdParam,
  async ({ document_id }) => {
    const data = await ouraRequest(
      collectionUrl("daily_spo2", document_id)
    );
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ─── Daily Stress ────────────────────────────────────────────────────────────

server.tool(
  "get_daily_stress",
  "Get daily stress data including stress high/recovery/rest minutes for a date range",
  dateRangeParams,
  async (params) => {
    const data = await ouraRequest(collectionUrl("daily_stress"), params);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_daily_stress_by_id",
  "Get a specific daily stress document by its ID",
  documentIdParam,
  async ({ document_id }) => {
    const data = await ouraRequest(
      collectionUrl("daily_stress", document_id)
    );
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ─── Daily Resilience ────────────────────────────────────────────────────────

server.tool(
  "get_daily_resilience",
  "Get daily resilience data including sleep recovery, daytime recovery, and stress for a date range",
  dateRangeParams,
  async (params) => {
    const data = await ouraRequest(collectionUrl("daily_resilience"), params);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_daily_resilience_by_id",
  "Get a specific daily resilience document by its ID",
  documentIdParam,
  async ({ document_id }) => {
    const data = await ouraRequest(
      collectionUrl("daily_resilience", document_id)
    );
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ─── Daily Cardiovascular Age ────────────────────────────────────────────────

server.tool(
  "get_daily_cardiovascular_age",
  "Get daily cardiovascular age estimates for a date range",
  dateRangeParams,
  async (params) => {
    const data = await ouraRequest(
      collectionUrl("daily_cardiovascular_age"),
      params
    );
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_daily_cardiovascular_age_by_id",
  "Get a specific daily cardiovascular age document by its ID",
  documentIdParam,
  async ({ document_id }) => {
    const data = await ouraRequest(
      collectionUrl("daily_cardiovascular_age", document_id)
    );
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ─── VO2 Max ─────────────────────────────────────────────────────────────────

server.tool(
  "get_vo2_max",
  "Get VO2 max estimates for a date range",
  dateRangeParams,
  async (params) => {
    const data = await ouraRequest(collectionUrl("vO2_max"), params);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_vo2_max_by_id",
  "Get a specific VO2 max document by its ID",
  documentIdParam,
  async ({ document_id }) => {
    const data = await ouraRequest(collectionUrl("vO2_max", document_id));
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ─── Workout ─────────────────────────────────────────────────────────────────

server.tool(
  "get_workouts",
  "Get workout data including activity type, calories, distance, intensity, and duration for a date range",
  dateRangeParams,
  async (params) => {
    const data = await ouraRequest(collectionUrl("workout"), params);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_workout_by_id",
  "Get a specific workout document by its ID",
  documentIdParam,
  async ({ document_id }) => {
    const data = await ouraRequest(collectionUrl("workout", document_id));
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ─── Session ─────────────────────────────────────────────────────────────────

server.tool(
  "get_sessions",
  "Get guided/unguided session (meditation, breathing) data including HR, HRV, and mood for a date range",
  dateRangeParams,
  async (params) => {
    const data = await ouraRequest(collectionUrl("session"), params);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_session_by_id",
  "Get a specific session document by its ID",
  documentIdParam,
  async ({ document_id }) => {
    const data = await ouraRequest(collectionUrl("session", document_id));
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ─── Enhanced Tag ────────────────────────────────────────────────────────────

server.tool(
  "get_enhanced_tags",
  "Get enhanced tag data (user-entered lifestyle tags like caffeine, alcohol, exercise) for a date range",
  dateRangeParams,
  async (params) => {
    const data = await ouraRequest(collectionUrl("enhanced_tag"), params);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_enhanced_tag_by_id",
  "Get a specific enhanced tag document by its ID",
  documentIdParam,
  async ({ document_id }) => {
    const data = await ouraRequest(
      collectionUrl("enhanced_tag", document_id)
    );
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ─── Tag (deprecated) ────────────────────────────────────────────────────────

server.tool(
  "get_tags",
  "Get tag data for a date range (deprecated: use get_enhanced_tags instead)",
  dateRangeParams,
  async (params) => {
    const data = await ouraRequest(collectionUrl("tag"), params);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_tag_by_id",
  "Get a specific tag document by its ID (deprecated: use get_enhanced_tag_by_id instead)",
  documentIdParam,
  async ({ document_id }) => {
    const data = await ouraRequest(collectionUrl("tag", document_id));
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ─── Rest Mode Period ────────────────────────────────────────────────────────

server.tool(
  "get_rest_mode_periods",
  "Get rest mode period data for a date range",
  dateRangeParams,
  async (params) => {
    const data = await ouraRequest(
      collectionUrl("rest_mode_period"),
      params
    );
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_rest_mode_period_by_id",
  "Get a specific rest mode period document by its ID",
  documentIdParam,
  async ({ document_id }) => {
    const data = await ouraRequest(
      collectionUrl("rest_mode_period", document_id)
    );
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ─── Ring Configuration ──────────────────────────────────────────────────────

server.tool(
  "get_ring_configuration",
  "Get ring hardware configuration data (color, design, firmware, set date) for a date range",
  dateRangeParams,
  async (params) => {
    const data = await ouraRequest(
      collectionUrl("ring_configuration"),
      params
    );
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_ring_configuration_by_id",
  "Get a specific ring configuration document by its ID",
  documentIdParam,
  async ({ document_id }) => {
    const data = await ouraRequest(
      collectionUrl("ring_configuration", document_id)
    );
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ─── Webhook Subscriptions ───────────────────────────────────────────────────

server.tool(
  "list_webhook_subscriptions",
  "List all webhook subscriptions",
  {},
  async () => {
    const data = await ouraRequest(OURA_WEBHOOK_BASE);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "create_webhook_subscription",
  "Create a new webhook subscription for data updates",
  {
    callback_url: z.string().describe("The URL to receive webhook callbacks"),
    verification_token: z
      .string()
      .describe("A token used to verify the webhook"),
    event_type: z
      .string()
      .describe(
        "The event type to subscribe to (e.g. create, update, delete)"
      ),
    data_type: z
      .string()
      .describe(
        "The data type to subscribe to (e.g. tag, enhanced_tag, workout, session, sleep, daily_sleep, daily_readiness, daily_activity, daily_spo2, daily_stress, rest_mode_period, ring_configuration, daily_cardiovascular_age, daily_resilience, vO2_max, sleep_time)"
      ),
  },
  async (params) => {
    const data = await ouraRequest(
      OURA_WEBHOOK_BASE,
      undefined,
      "POST",
      params
    );
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "delete_webhook_subscription",
  "Delete a webhook subscription by its ID",
  {
    subscription_id: z
      .string()
      .describe("The webhook subscription ID to delete"),
  },
  async ({ subscription_id }) => {
    const data = await ouraRequest(
      `${OURA_WEBHOOK_BASE}/${subscription_id}`,
      undefined,
      "DELETE"
    );
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "renew_webhook_subscription",
  "Renew a webhook subscription by its ID (subscriptions expire after 7 days)",
  {
    subscription_id: z
      .string()
      .describe("The webhook subscription ID to renew"),
  },
  async ({ subscription_id }) => {
    const data = await ouraRequest(
      `${OURA_WEBHOOK_BASE}/renew/${subscription_id}`,
      undefined,
      "PUT"
    );
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ─── Start Server ────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Oura MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
