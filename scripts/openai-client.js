const fetch = require('node-fetch');

const OPENAI_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';

async function callChat(messages, opts = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set in environment');

  const body = {
    model: opts.model || 'gpt-3.5-turbo',
    messages,
    temperature: opts.temperature != null ? opts.temperature : 0.2,
    max_tokens: opts.max_tokens || 1200
  };

  const resp = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const text = await resp.text();
    const err = new Error(`OpenAI API error: ${resp.status} ${resp.statusText} - ${text}`);
    err.status = resp.status;
    throw err;
  }

  const data = await resp.json();
  const choice = data.choices && data.choices[0];
  if (!choice) return null;
  return choice.message && choice.message.content;
}

module.exports = { callChat };
