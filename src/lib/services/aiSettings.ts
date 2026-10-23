import { Store } from '@tauri-apps/plugin-store';

export type AIProvider = 'openrouter' | 'gemini' | 'mistral';

export interface AISettings {
  provider: AIProvider;
  openrouterKey: string;
  openrouterModel: string;
  geminiKey: string;
  geminiModel: string;
  mistralKey: string;
  mistralModel: string;
}

const SETTINGS_FILENAME = 'roaddev-settings.json';
const SETTINGS_KEY = 'ai_settings';

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'openrouter',
  openrouterKey: '',
  openrouterModel: 'nvidia/nemotron-3.5-lightning:free',
  geminiKey: '',
  geminiModel: 'gemini-2.0-flash',
  mistralKey: '',
  mistralModel: 'mistral-large-latest',
};

let storeInstance: Store | null = null;

async function getSettingsStore(): Promise<Store | null> {
  if (storeInstance) {
    return storeInstance;
  }

  try {
    storeInstance = await Store.load(SETTINGS_FILENAME);
    return storeInstance;
  } catch (err) {
    console.warn('Tauri Store unavailable for settings, using localStorage fallback:', err);
    return null;
  }
}

/**
 * Charge les paramètres d'IA depuis le store sécurisé de l'OS
 */
export async function loadAISettings(): Promise<AISettings> {
  let settings: AISettings = { ...DEFAULT_AI_SETTINGS };
  let loadedFromStore = false;

  try {
    const store = await getSettingsStore();
    if (store) {
      const saved = await store.get<Partial<AISettings>>(SETTINGS_KEY);
      if (saved && typeof saved === 'object' && Object.keys(saved).length > 0) {
        settings = { ...DEFAULT_AI_SETTINGS, ...saved };
        loadedFromStore = true;
      }
    }
  } catch (err) {
    console.error('Erreur chargement paramètres IA depuis le store:', err);
  }

  // Fallback localStorage uniquement si le store OS n'a pas pu être chargé
  if (!loadedFromStore) {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          settings = { ...settings, ...parsed };
        }
      }
    } catch {
      // Ignore
    }
  } else {
    // Garde le localStorage synchronisé avec le store officiel
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore
    }
  }

  // Si le modèle était sur 'auto-free', basculer sur le modèle par défaut
  if (!settings.openrouterModel || settings.openrouterModel === 'auto-free') {
    settings.openrouterModel = DEFAULT_AI_SETTINGS.openrouterModel;
  }

  // Migration automatique vers OpenRouter (Gemini direct n'est plus privilégié)
  if (settings.provider === 'gemini') {
    settings.provider = 'openrouter';
    saveAISettings(settings).catch(() => {});
  }

  if (settings.openrouterKey && settings.provider !== 'mistral') {
    settings.provider = 'openrouter';
  }

  return settings;
}

/**
 * Enregistre les paramètres d'IA dans le store sécurisé
 */
export async function saveAISettings(settings: AISettings): Promise<void> {
  try {
    const store = await getSettingsStore();
    if (store) {
      await store.set(SETTINGS_KEY, settings);
      await store.save();
    }
  } catch (err) {
    console.error('Erreur sauvegarde paramètres IA dans le store:', err);
  }

  // Fallback localStorage
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Erreur sauvegarde paramètres IA dans localStorage:', err);
  }
}
