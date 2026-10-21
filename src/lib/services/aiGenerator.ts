import type { AISettings } from '$lib/services/aiSettings';
import type { RoadmapModel, PhaseSection, TaskItem } from '$lib/types/roadmap';
import { callOpenRouter } from '$lib/services/openrouterService';

export interface GeneratedRoadmapJSON {
  project_summary?: string;
  phases: {
    title: string;
    tasks: string[];
  }[];
}

const SYSTEM_PROMPT = `Tu es un architecte logiciel senior expert. Tu analyses la documentation d'un projet logiciel (README.md) pour produire une roadmap de développement technique complète, logique, et actionnable.

La sortie doit être STRICTEMENT au format JSON valide respectant exactement ce schéma :
{
  "project_summary": "Description concise du projet",
  "phases": [
    {
      "title": "Phase 1 : Socle & Configuration",
      "tasks": [
        "Configurer les outils et dépendances",
        "Poser l'architecture initiale"
      ]
    },
    {
      "title": "Phase 2 : Backend & Moteur Métier",
      "tasks": [
        "Développer les services clés"
      ]
    },
    {
      "title": "Phase 3 : Interface Utilisateur",
      "tasks": [
        "Créer les composants graphiques"
      ]
    },
    {
      "title": "Phase 4 : Tests & Déploiement",
      "tasks": [
        "Écrire les tests unitaires et d'intégration"
      ]
    }
  ]
}

Règles impératives :
1. Découpe en 3 à 5 phases logiques et ordonnées chronologiquement.
2. Chaque tâche doit être une action atomique, précise et directement vérifiable par un développeur.
3. Rends UNIQUEMENT du code JSON valide, sans balises additionnelles hors du bloc.`;

function cleanJsonResponse(rawText: string): string {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * Appelle l'API Google Gemini
 */
async function callGemini(
  prompt: string,
  apiKey: string,
  model = 'gemini-2.0-flash'
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData?.error?.message || `Erreur API Gemini (${response.status} ${response.statusText})`;
    throw new Error(message);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("L'API Gemini n'a retourné aucun contenu exploitable.");
  }

  return text;
}

/**
 * Appelle l'API Mistral AI
 */
async function callMistral(
  prompt: string,
  apiKey: string,
  model = 'mistral-large-latest'
): Promise<string> {
  const url = 'https://api.mistral.ai/v1/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData?.message || `Erreur API Mistral (${response.status} ${response.statusText})`;
    throw new Error(message);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("L'API Mistral n'a retourné aucun contenu exploitable.");
  }

  return text;
}

/**
 * Teste la validité de la clé API
 */
export async function testAIConnection(
  settings: AISettings
): Promise<{ success: boolean; message: string }> {
  try {
    if (settings.provider === 'openrouter') {
      if (!settings.openrouterKey) {
        return { success: false, message: 'La clé API OpenRouter est manquante.' };
      }
      await callOpenRouter(
        'Réponds UNIQUEMENT par cet objet JSON valide : {"status": "ok"}',
        settings.openrouterKey,
        settings.openrouterModel,
        'Tu es un assistant JSON. Réponds en JSON valide sans fioritures.'
      );
      const modelLabel =
        settings.openrouterModel === 'auto-free'
          ? 'Pool de modèles gratuits actif'
          : settings.openrouterModel;
      return {
        success: true,
        message: `Connexion réussie avec OpenRouter (${modelLabel}) !`,
      };
    } else if (settings.provider === 'gemini') {
      if (!settings.geminiKey) {
        return { success: false, message: 'La clé API Google AI Studio est manquante.' };
      }
      await callGemini(
        'Réponds par un objet JSON valide : {"status": "ok"}',
        settings.geminiKey,
        settings.geminiModel
      );
      return { success: true, message: 'Connexion réussie avec Google AI Studio (Gemini) !' };
    } else {
      if (!settings.mistralKey) {
        return { success: false, message: 'La clé API Mistral est manquante.' };
      }
      await callMistral(
        'Réponds par un objet JSON valide : {"status": "ok"}',
        settings.mistralKey,
        settings.mistralModel
      );
      return { success: true, message: 'Connexion réussie avec Mistral AI !' };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Erreur inconnue de connexion.' };
  }
}

/**
 * Analyse le README et génère une roadmap structurée
 */
export async function generateRoadmapFromReadme(
  projectName: string,
  readmeContent: string,
  settings: AISettings
): Promise<RoadmapModel> {
  const userPrompt = `${SYSTEM_PROMPT}

Voici les informations sur le projet :
Nom du projet : ${projectName}

Contenu du README.md :
${readmeContent || 'Aucun contenu fourni. Génère une roadmap standard de développement logiciel complète.'}

Rappel : Génère une roadmap complète et actionnable sous forme de phases et de tâches en JSON strict.`;

  let rawJson: string;

  if (settings.provider === 'openrouter') {
    if (!settings.openrouterKey) {
      throw new Error(
        'Clé API OpenRouter non configurée. Cliquez sur Paramètres API pour la renseigner.'
      );
    }
    rawJson = await callOpenRouter(
      userPrompt,
      settings.openrouterKey,
      settings.openrouterModel,
      SYSTEM_PROMPT
    );
  } else if (settings.provider === 'gemini') {
    if (!settings.geminiKey) {
      throw new Error(
        'Clé API Google AI Studio non configurée. Cliquez sur Paramètres API pour la renseigner.'
      );
    }
    rawJson = await callGemini(userPrompt, settings.geminiKey, settings.geminiModel);
  } else {
    if (!settings.mistralKey) {
      throw new Error(
        'Clé API Mistral non configurée. Cliquez sur Paramètres API pour la renseigner.'
      );
    }
    rawJson = await callMistral(userPrompt, settings.mistralKey, settings.mistralModel);
  }

  const cleaned = cleanJsonResponse(rawJson);
  const parsedData: GeneratedRoadmapJSON = JSON.parse(cleaned);

  if (!parsedData.phases || !Array.isArray(parsedData.phases)) {
    throw new Error('Le format JSON retourné ne contient pas de liste de phases valide.');
  }

  const phases: PhaseSection[] = parsedData.phases.map((p, pIndex) => ({
    id: crypto.randomUUID(),
    title: p.title || `Phase ${pIndex + 1}`,
    isCollapsed: false,
    tasks: (p.tasks || []).map((taskTitle) => ({
      id: crypto.randomUUID(),
      title: taskTitle,
      completed: false,
    })),
  }));

  const summary = parsedData.project_summary
    ? `> ${parsedData.project_summary}`
    : '> Suivi de projet généré par RoadDev via IA';

  return {
    title: `# Roadmap — ${projectName}`,
    description: summary,
    phases,
  };
}

/**
 * Fusionne intelligemment une roadmap existante avec de nouvelles phases IA
 */
export function mergeRoadmaps(existing: RoadmapModel, generated: RoadmapModel): RoadmapModel {
  const existingPhaseTitles = new Set(
    existing.phases.map((p) => p.title.toLowerCase().replace(/phase\s*\d+\s*:\s*/, '').trim())
  );

  const mergedPhases: PhaseSection[] = [...existing.phases];

  for (const genPhase of generated.phases) {
    const cleanGenTitle = genPhase.title.toLowerCase().replace(/phase\s*\d+\s*:\s*/, '').trim();

    // Si la phase existe déjà, fusionner les tâches
    const existingMatch = mergedPhases.find(
      (p) => p.title.toLowerCase().replace(/phase\s*\d+\s*:\s*/, '').trim() === cleanGenTitle
    );

    if (existingMatch) {
      const existingTaskTitles = new Set(existingMatch.tasks.map((t) => t.title.toLowerCase().trim()));
      for (const genTask of genPhase.tasks) {
        if (!existingTaskTitles.has(genTask.title.toLowerCase().trim())) {
          existingMatch.tasks.push(genTask);
        }
      }
    } else {
      mergedPhases.push(genPhase);
    }
  }

  return {
    title: existing.title || generated.title,
    description: existing.description || generated.description,
    phases: mergedPhases,
  };
}
