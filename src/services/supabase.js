/**
 * AlgoLog — services/supabase.js
 * Single Supabase client instance. Import this everywhere — never
 * instantiate createClient() a second time or sessions will de-sync.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '[AlgoLog] Missing Supabase env vars. ' +
    'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ── AI Hint via Groq ──────────────────────────────────────────

export async function fetchAIHint(problemTitle, dsTags = []) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `You are a coding interview coach. Give a conceptual hint (no code, no full solution) for this problem:

Problem: "${problemTitle}"
Tags: ${dsTags.join(', ') || 'general'}

Give a 2-3 sentence hint that nudges toward the right approach without spoiling it.`
        }
      ]
    })
  });

  const data = await response.json();
  console.log('Groq response:', JSON.stringify(data));
  return data.choices?.[0]?.message?.content ?? 'No hint available.';
}