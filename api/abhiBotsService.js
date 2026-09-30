const ABHIBOTS_MESSAGES_URL = 'https://opus.abhibots.com/v1/messages';
const ABHIBOTS_API_KEY_ENV = 'ABHIBOTS_API_KEY';
const ANTHROPIC_VERSION = '2023-06-01';

export async function abhiBotsService({ model, messages, maxTokens = 2048 }) {
  const key = process.env[ABHIBOTS_API_KEY_ENV];

  if (!key) {
    const error = new Error('AI is not configured yet. Add ABHIBOTS_API_KEY in Vercel Environment Variables.');
    error.status = 503;
    throw error;
  }

  const safeMessages = messages
    .filter(message => message.role !== 'system')
    .map(({ role, content }) => ({
      role: role === 'assistant' ? 'assistant' : 'user',
      content: String(content).slice(0, 30000),
    }));

  const system = messages
    .filter(message => message.role === 'system')
    .map(message => String(message.content).slice(0, 30000))
    .join('\n');

  const body = {
    model: model?.model_id || 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    ...(system ? { system } : {}),
    messages: safeMessages,
  };

  const response = await fetch(ABHIBOTS_MESSAGES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('AbhiBots request failed:', response.status, data?.error || '');
    const error = new Error(
      response.status === 429
        ? 'The AI service is busy. Please try again shortly.'
        : data?.error?.message || 'The selected model could not respond. Check its configuration or try another model.'
    );
    error.status = response.status === 429 ? 429 : 502;
    throw error;
  }

  const content = data.content
    ?.filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n');

  if (!content || typeof content !== 'string') {
    throw new Error('The model returned an empty response.');
  }

  return { content, usage: data.usage ?? null };
}
