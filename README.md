# Oura MCP Server

An MCP (Model Context Protocol) server that integrates the [Oura Ring API v2](https://cloud.ouraring.com/v2/docs) with Claude. Access your sleep, activity, readiness, heart rate, and other health data directly from Claude.

## Setup

### 1. Get an Oura Access Token

Go to [https://cloud.ouraring.com/personal-access-tokens](https://cloud.ouraring.com/personal-access-tokens) and create a Personal Access Token (or use OAuth2).

### 2. Install & Build

```bash
npm install
npm run build
```

### 3. Configure Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "oura": {
      "command": "node",
      "args": ["/absolute/path/to/oura-mcp-server/dist/index.js"],
      "env": {
        "OURA_ACCESS_TOKEN": "your_oura_access_token_here"
      }
    }
  }
}
```

## Available Tools

### Health Data
| Tool | Description |
|------|-------------|
| `get_personal_info` | User profile (age, weight, height, email) |
| `get_daily_activity` | Steps, calories, MET minutes, movement |
| `get_daily_readiness` | Readiness score, HRV balance, temperature |
| `get_daily_sleep` | Daily sleep score summary |
| `get_sleep` | Detailed sleep periods (stages, HR, HRV) |
| `get_sleep_time` | Optimal bedtime recommendations |
| `get_heart_rate` | Heart rate time-series (5-min intervals) |
| `get_daily_spo2` | Blood oxygen saturation |
| `get_daily_stress` | Stress and recovery minutes |
| `get_daily_resilience` | Resilience metrics |
| `get_daily_cardiovascular_age` | Cardiovascular age estimate |
| `get_vo2_max` | VO2 max estimate |
| `get_workouts` | Workout records |
| `get_sessions` | Meditation/breathing sessions |
| `get_enhanced_tags` | Lifestyle tags (caffeine, alcohol, etc.) |
| `get_rest_mode_periods` | Rest mode data |
| `get_ring_configuration` | Ring hardware info |

### Webhooks
| Tool | Description |
|------|-------------|
| `list_webhook_subscriptions` | List all webhook subscriptions |
| `create_webhook_subscription` | Subscribe to data updates |
| `delete_webhook_subscription` | Remove a subscription |
| `renew_webhook_subscription` | Renew before 7-day expiry |

Most collection tools accept `start_date` and `end_date` (YYYY-MM-DD). Heart rate uses `start_datetime` and `end_datetime` (ISO 8601). Each collection also has a `*_by_id` variant for fetching a single document.

## Example Prompts

- "How did I sleep last night?"
- "Show me my activity data for this week"
- "What's my readiness score today?"
- "Plot my heart rate from yesterday"
- "Compare my sleep quality over the past month"

## License

MIT
