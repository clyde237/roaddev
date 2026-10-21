export interface OpenRouterModelInfo {
  id: string;
  name: string;
}

export const RECOMMENDED_NEMOTRON_CHAT = 'nvidia/nemotron-3.5-lightning:free';
export const RECOMMENDED_NEMOTRON_EMBED = 'nvidia/nemotron-3.5-embed-1b:free';

/**
 * Extrait le contenu texte d'une réponse de complétion OpenRouter
 */
function extractResponseContent(data: any): string {
  const choice = data?.choices?.[0];
  if (!choice) {
    throw new Error("L'API OpenRouter n'a retourné aucun choix.");
  }

  const content = choice.message?.content || choice.message?.reasoning || choice.text;
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new Error("L'API OpenRouter n'a retourné aucun contenu texte exploitable.");
  }

  return content.trim();
}

/**
 * Calcule l'embedding vectoriel d'un texte via l'API OpenRouter
 * Conforme au modèle spécifié: nvidia/nemotron-3.5-embed-1b:free
 */
export async function generateEmbedding(
  input: string | string[],
  apiKey: string,
  model = RECOMMENDED_NEMOTRON_EMBED
): Promise<number[]> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('La clé API OpenRouter est manquante.');
  }

  const endpoint = 'https://openrouter.ai/api/v1/embeddings';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      'HTTP-Referer': 'https://github.com/clyde237/roaddev',
      'X-Title': 'RoadDev Desktop',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input,
      encoding_format: 'float',
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage =
      data?.error?.message || `Erreur Embedding OpenRouter (${response.status} ${response.statusText})`;
    throw new Error(errorMessage);
  }

  const vector = data?.data?.[0]?.embedding;
  if (!vector || !Array.isArray(vector)) {
    throw new Error("L'API OpenRouter n'a retourné aucun vecteur d'embedding valide.");
  }

  return vector;
}

/**
 * Envoie une requête de génération de texte à OpenRouter avec le modèle NVIDIA Nemotron spécifié
 */
export async function callOpenRouter(
  prompt: string,
  apiKey: string,
  model = RECOMMENDED_NEMOTRON_CHAT,
  systemPrompt?: string
): Promise<string> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('La clé API OpenRouter est manquante.');
  }

  // OpenRouter refuse les modèles d'embedding sur /chat/completions (Erreur 400).
  // Si le modèle d'embedding est spécifié pour générer du texte, on utilise automatiquement
  // le modèle de chat génératif de la même famille (NVIDIA Nemotron 3.5 Lightning).
  let targetModel = model && model.trim() !== '' ? model.trim() : RECOMMENDED_NEMOTRON_CHAT;
  if (targetModel === RECOMMENDED_NEMOTRON_EMBED || targetModel.includes('embed')) {
    targetModel = RECOMMENDED_NEMOTRON_CHAT;
  }

  const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
  const headers = {
    Authorization: `Bearer ${apiKey.trim()}`,
    'HTTP-Referer': 'https://github.com/clyde237/roaddev',
    'X-Title': 'RoadDev Desktop',
    'Content-Type': 'application/json',
  };

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: targetModel,
      messages,
      temperature: 0.2,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = data?.error?.message || `Erreur OpenRouter (${response.status} ${response.statusText})`;
    throw new Error(errorMessage);
  }

  return extractResponseContent(data);
}
