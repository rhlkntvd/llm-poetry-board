import { models, ProviderError, type Generate } from './edition.ts';

export const live: Generate = async (model, prompt, settings) => {
  const start = Date.now();
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, temperature: settings.temperature, max_tokens: settings.max_tokens,
      response_format: settings.jsonModeModels?.includes(model) ? { type: 'json_object' } : undefined,
      provider: { max_price: { prompt: 0.2, completion: 0.5 }, require_parameters: true },
      messages: [{ role: 'system', content: settings.instructions }, { role: 'user', content: prompt }]
    }),
    signal: AbortSignal.timeout(45000)
  });
  if (!response.ok) throw new ProviderError('OpenRouter HTTP ' + response.status);
  const data = await response.json().catch(() => { throw new ProviderError('OpenRouter response was not JSON'); });
  const choice = data?.choices?.[0];
  if (choice?.finish_reason === 'length') throw new ProviderError('Model output reached token limit');
  const content = choice?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new ProviderError('OpenRouter returned no model text');
  const fenced = /^`{3}(?:json)?\s*\n([\s\S]*?)\n`{3}$/i.exec(content.trim());
  let text;
  try {
    text = JSON.parse(fenced ? fenced[1] : content);
  } catch {
    throw new ProviderError('Model output was not valid JSON');
  }
  return {
    text,
    metadata: { request: data.id, model: data.model, provider: data.provider, usage: data.usage, latencyMs: Date.now()-start }
  };
};

const samples = [
  ['After Closing', 'The last light folds its sleeves.\nUnder the sill, a cricket\ntries the same note twice.'],
  ['Inventory', 'One square of sun.\nTwo cups gone cold.\nThe dust keeps count\nof what we meant to hold.'],
  ['Hinge', 'Something small gives way in the quiet.\nEven the shadow turns its head.'],
  ['A Second Look', 'I came back for my coat\nand found the afternoon\nstill hanging from its hook.']
];
export const demo: Generate = async model => {
  const [title, body] = samples[models.indexOf(model)];
  return { text: { title, body }, metadata: { source: 'offline fixture' } };
};
