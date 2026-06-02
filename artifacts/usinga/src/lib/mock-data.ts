export const providers = [
  {
    id: "openai",
    name: "OpenAI",
    phase: "active",
    status: "active",
    requests: 1284,
    cost: 48.62,
    latency: 820,
    capabilities: ["chat", "embeddings", "images", "speech"]
  },
  {
    id: "groq",
    name: "Groq",
    phase: "active",
    status: "active",
    requests: 934,
    cost: 12.38,
    latency: 146,
    capabilities: ["chat", "low-latency inference"]
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    phase: "active",
    status: "degraded",
    requests: 311,
    cost: 7.44,
    latency: 1140,
    capabilities: ["models", "datasets", "inference"]
  },
  {
    id: "anthropic",
    name: "Anthropic",
    phase: "coming_soon",
    status: "coming soon",
    requests: 0,
    cost: 0,
    latency: 0,
    capabilities: ["chat"]
  },
  {
    id: "twilio",
    name: "Twilio",
    phase: "coming_soon",
    status: "coming soon",
    requests: 0,
    cost: 0,
    latency: 0,
    capabilities: ["communications"]
  }
];

export const usageSeries = [
  { day: "Mon", requests: 340, cost: 8.2 },
  { day: "Tue", requests: 420, cost: 10.4 },
  { day: "Wed", requests: 388, cost: 9.7 },
  { day: "Thu", requests: 612, cost: 15.1 },
  { day: "Fri", requests: 744, cost: 18.9 },
  { day: "Sat", requests: 512, cost: 12.6 },
  { day: "Sun", requests: 301, cost: 7.8 }
];

export const auditEvents = [
  "Health check completed for OpenAI",
  "Routing test selected Groq for low-latency chat",
  "OpenAI budget updated to $100.00",
  "Hugging Face key rotated",
  "Cost alert created for all providers"
];
