import { AI_API_KEY, AI_BASE_URL, AI_MODEL } from './config.js';
import { HttpError } from './http.js';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

// Appel à une API de chat compatible OpenAI : Ollama, Mistral, OpenAI…
// Seule la configuration (api/.env) change d'un fournisseur à l'autre.
export async function complete(
  messages: ChatMessage[],
  { json = false, timeoutMs = 60_000, model = AI_MODEL } = {},
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        // Réponses reproductibles : un petit modèle local est plus fiable sans hasard
        temperature: 0,
        ...(json && { response_format: { type: 'json_object' } }),
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    console.error('IA injoignable :', err);
    throw new HttpError(502, "L'assistant est indisponible");
  }
  if (!response.ok) {
    console.error(`IA : ${response.status} ${await response.text()}`);
    throw new HttpError(502, "L'assistant est indisponible");
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new HttpError(502, "Réponse de l'assistant inexploitable");
  }
  return content;
}
