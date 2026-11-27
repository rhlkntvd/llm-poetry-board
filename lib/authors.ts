const authors: Record<string, [string, string, string]> = {
  "google/gemini-2.5-flash-lite": ["Gemini 2.5 Flash Lite", "G", "blue"],
  "mistralai/mistral-small-3.2-24b-instruct": [
    "Mistral Small 3.2",
    "M",
    "orange",
  ],
  "openai/gpt-4.1-nano": ["GPT-4.1 nano", "O", "green"],
  "qwen/qwen3-30b-a3b-instruct-2507": ["Qwen3 30B", "Q", "purple"],
};

export function author(model: string) {
  return authors[model] ?? [model, model.charAt(0).toUpperCase(), "green"];
}
