export interface OpenRouterModelInfo {
  id: string;
  name: string;
  context_length?: number;
}

export const PRESET_FREE_MODELS: OpenRouterModelInfo[] = [
  { id: 'nvidia/nemotron-3.5-lightning:free', name: 'NVIDIA Nemotron 3.5 Lightning (1M tokens, ultra-rapide)' },
  { id: 'minimax/minimax-m3.1-flash:free', name: 'MiniMax M3.1 Flash (1M tokens)' },
  { id: 'google/gemma-4-26b-a4b-it:free', name: 'Google Gemma 4 26B (256k tokens)' },
  { id: 'google/gemma-4-31b-it:free', name: 'Google Gemma 4 31B (256k tokens)' },
  { id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', name: 'NVIDIA Nemotron 3 Nano Omni (Raisonnement)' },
  { id: 'cohere/north-mini-code:free', name: 'Cohere North Mini Code (Code)' },
];

export const FALLBACK_FREE_POOL_PRIMARY = [
  'nvidia/nemotron-3.5-lightning:free',
  'minimax/minimax-m3.1-flash:free',
  'google/gemma-4-26b-a4b-it:free',
];

export const FALLBACK_FREE_POOL_SECONDARY = [
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'cohere/north-mini-code:free',
];

let cachedFreeModels: OpenRouterModelInfo[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Récupère dynamiquement la liste des modèles gratuits disponibles sur OpenRouter
 */
export async function fetchFreeModels(apiKey?: string): Promise<OpenRouterModelInfo[]> {
  const now = Date.now();
  if (cachedFreeModels && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedFreeModels;
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers,
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data?.data)) {
        const freeModels: OpenRouterModelInfo[] = data.data
          .filter((m: any) => {
            const isFreeId = typeof m.id === 'string' && m.id.endsWith(':free');
            const isFreePricing =
              m.pricing &&
              (m.pricing.prompt === '0' || m.pricing.prompt === 0) &&
              (m.pricing.completion === '0' || m.pricing.completion === 0);
            return isFreeId || isFreePricing;
          })
          .map((m: any) => ({
            id: m.id,
            name: m.name ? `${m.name} (gratuit)` : m.id,
            context_length: m.context_length,
          }));

        if (freeModels.length > 0) {
          cachedFreeModels = freeModels;
          lastCacheTime = now;
          return freeModels;
        }
      }
    }
  } catch (err) {
    console.warn('Impossible de charger les modèles OpenRouter en ligne, utilisation des modèles prédéfinis:', err);
  }

  return PRESET_FREE_MODELS;
}

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
 * Calcule l'embedding vectoriel (représentation sémantique) via OpenRouter
 * Conforme au modèle spécifié: nvidia/nemotron-3.5-embed-1b:free
 */
export async function generateEmbedding(
  input: string | string[],
  apiKey: string,
  model = 'nvidia/nemotron-3.5-embed-1b:free'
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
 * Envoie une requête de complétion à OpenRouter avec gestion automatique des fallbacks gratuits
 */
export async function callOpenRouter(
  prompt: string,
  apiKey: string,
  preferredModel = 'auto-free',
  systemPrompt?: string
): Promise<string> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('La clé API OpenRouter est manquante.');
  }

  // Si l'utilisateur a sélectionné par mégarde le modèle d'embedding pour de la génération de texte,
  // nous basculons automatiquement vers le modèle LLM génératif correspondant de la même famille
  let targetModel = preferredModel;
  if (targetModel === 'nvidia/nemotron-3.5-embed-1b:free' || targetModel.includes('embed')) {
    console.info(
      `Redirection automatique du modèle d'embedding (${targetModel}) vers le modèle LLM génératif NVIDIA Nemotron 3.5 Lightning.`
    );
    targetModel = 'nvidia/nemotron-3.5-lightning:free';
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

  async function executeRequest(bodyPayload: Record<string, any>): Promise<string> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...bodyPayload,
        messages,
        temperature: 0.2,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data?.error?.message || `Erreur OpenRouter (${response.status} ${response.statusText})`;
      const error: any = new Error(errorMessage);
      error.status = response.status;
      error.raw = data;
      throw error;
    }

    return extractResponseContent(data);
  }

  // Si l'utilisateur a choisi la sélection automatique du meilleur modèle gratuit
  if (targetModel === 'auto-free') {
    try {
      // 1er essai : Pool primaire de 3 modèles gratuits concurrents (avec NVIDIA Nemotron en tête)
      return await executeRequest({ models: FALLBACK_FREE_POOL_PRIMARY });
    } catch (err: any) {
      console.warn('Échec pool primaire OpenRouter gratuit, basculement vers pool secondaire:', err?.message);
      // 2e essai : Pool secondaire de repli
      return await executeRequest({ models: FALLBACK_FREE_POOL_SECONDARY });
    }
  }

  // Modèle spécifique demandé par l'utilisateur
  try {
    return await executeRequest({ model: targetModel });
  } catch (err: any) {
    // Si le modèle spécifique est surchargé (429) ou indisponible, repli automatique sur le pool gratuit
    if (err.status === 429 || (err.message && err.message.toLowerCase().includes('rate-limit'))) {
      console.warn(`Modèle ${targetModel} surchargé (429), basculement automatique sur le pool de modèles gratuits:`, err.message);
      return await executeRequest({ models: FALLBACK_FREE_POOL_PRIMARY });
    }
    throw err;
  }
}
