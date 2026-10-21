import { describe, it, expect } from 'vitest';
import { parseRoadmapMarkdown } from '../markdownParser';
import { serializeRoadmapMarkdown } from '../markdownSerializer';
import { calculateRoadmapProgress } from '../roadmapSync';
import { mergeRoadmaps } from '../aiGenerator';
import type { RoadmapModel } from '$lib/types/roadmap';

describe('Moteur Markdown de Roadmap', () => {
  const sampleMarkdown = `# Roadmap — RoadDev
> Suivi généré par RoadDev

## Phase 1 : Socle & Config
- [x] Configurer adapter-static SvelteKit
- [ ] Installer plugins fs, dialog, store

## Phase 2 : Moteur IA & Parseur
- [ ] Créer le client API Gemini/Mistral
`;

  it('doit parser correctement un document Markdown standard', () => {
    const roadmap = parseRoadmapMarkdown(sampleMarkdown, 'RoadDev');

    expect(roadmap.title).toBe('# Roadmap — RoadDev');
    expect(roadmap.description).toBe('> Suivi généré par RoadDev');
    expect(roadmap.phases).toHaveLength(2);

    expect(roadmap.phases[0].title).toBe('Phase 1 : Socle & Config');
    expect(roadmap.phases[0].tasks).toHaveLength(2);
    expect(roadmap.phases[0].tasks[0].title).toBe('Configurer adapter-static SvelteKit');
    expect(roadmap.phases[0].tasks[0].completed).toBe(true);
    expect(roadmap.phases[0].tasks[1].completed).toBe(false);

    expect(roadmap.phases[1].title).toBe('Phase 2 : Moteur IA & Parseur');
    expect(roadmap.phases[1].tasks).toHaveLength(1);
    expect(roadmap.phases[1].tasks[0].completed).toBe(false);
  });

  it('doit tolérer les variantes de cases à cocher (*, - [X], espaces)', () => {
    const customMarkdown = `## Phase Unique
* [X] Tâche majuscule
-   [ ] Tâche avec espaces
`;
    const roadmap = parseRoadmapMarkdown(customMarkdown, 'Test');
    expect(roadmap.phases).toHaveLength(1);
    expect(roadmap.phases[0].tasks).toHaveLength(2);
    expect(roadmap.phases[0].tasks[0].completed).toBe(true);
    expect(roadmap.phases[0].tasks[1].completed).toBe(false);
    expect(roadmap.phases[0].tasks[1].title).toBe('Tâche avec espaces');
  });

  it('doit sérialiser fidèlement le modèle vers Markdown', () => {
    const model: RoadmapModel = {
      title: '# Roadmap — MonProjet',
      description: '> Suivi de projet',
      phases: [
        {
          id: '1',
          title: 'Phase 1 : Test',
          tasks: [
            { id: 't1', title: 'Action 1', completed: true },
            { id: 't2', title: 'Action 2', completed: false },
          ],
        },
      ],
    };

    const md = serializeRoadmapMarkdown(model);
    expect(md).toContain('# Roadmap — MonProjet');
    expect(md).toContain('> Suivi de projet');
    expect(md).toContain('## Phase 1 : Test');
    expect(md).toContain('- [x] Action 1');
    expect(md).toContain('- [ ] Action 2');
  });

  it('doit garantir la cohérence en aller-retour (Roundtrip parse -> serialize -> parse)', () => {
    const firstParse = parseRoadmapMarkdown(sampleMarkdown, 'RoadDev');
    const serialized = serializeRoadmapMarkdown(firstParse);
    const secondParse = parseRoadmapMarkdown(serialized, 'RoadDev');

    expect(secondParse.phases).toHaveLength(firstParse.phases.length);
    expect(secondParse.phases[0].title).toBe(firstParse.phases[0].title);
    expect(secondParse.phases[0].tasks[0].completed).toBe(true);
    expect(secondParse.phases[0].tasks[1].completed).toBe(false);
  });

  it('doit calculer correctement les statistiques de progression', () => {
    const model: RoadmapModel = {
      title: 'Titre',
      description: '',
      phases: [
        {
          id: '1',
          title: 'Phase 1',
          tasks: [
            { id: '1', title: 'T1', completed: true },
            { id: '2', title: 'T2', completed: true },
            { id: '3', title: 'T3', completed: false },
            { id: '4', title: 'T4', completed: false },
          ],
        },
      ],
    };

    const stats = calculateRoadmapProgress(model);
    expect(stats.total).toBe(4);
    expect(stats.completed).toBe(2);
    expect(stats.percent).toBe(50);
  });

  it('doit fusionner intelligemment deux roadmaps sans écraser les tâches cochées', () => {
    const existing: RoadmapModel = {
      title: 'Roadmap',
      description: '',
      phases: [
        {
          id: '1',
          title: 'Phase 1 : Socle',
          tasks: [{ id: '1', title: 'Tâche existante', completed: true }],
        },
      ],
    };

    const generated: RoadmapModel = {
      title: 'Roadmap',
      description: '',
      phases: [
        {
          id: '2',
          title: 'Phase 1 : Socle',
          tasks: [
            { id: '3', title: 'Tâche existante', completed: false },
            { id: '4', title: 'Nouvelle tâche', completed: false },
          ],
        },
        {
          id: '5',
          title: 'Phase 2 : Déploiement',
          tasks: [{ id: '6', title: 'Docker', completed: false }],
        },
      ],
    };

    const merged = mergeRoadmaps(existing, generated);
    expect(merged.phases).toHaveLength(2);
    // La phase 1 doit avoir 2 tâches et la tâche existante doit rester complétée
    expect(merged.phases[0].tasks).toHaveLength(2);
    expect(merged.phases[0].tasks[0].completed).toBe(true);
    expect(merged.phases[0].tasks[1].title).toBe('Nouvelle tâche');
    // La phase 2 doit avoir été ajoutée
    expect(merged.phases[1].title).toBe('Phase 2 : Déploiement');
  });

  it('doit exposer les pools de modèles gratuits OpenRouter et la configuration par défaut', async () => {
    const { DEFAULT_AI_SETTINGS } = await import('../aiSettings');
    const { PRESET_FREE_MODELS, FALLBACK_FREE_POOL_PRIMARY } = await import('../openrouterService');

    expect(DEFAULT_AI_SETTINGS.provider).toBe('openrouter');
    expect(DEFAULT_AI_SETTINGS.openrouterModel).toBe('nvidia/nemotron-3.5-lightning:free');
    expect(PRESET_FREE_MODELS.length).toBeGreaterThan(0);
    expect(FALLBACK_FREE_POOL_PRIMARY.length).toBe(3);
    expect(FALLBACK_FREE_POOL_PRIMARY[0]).toBe('nvidia/nemotron-3.5-lightning:free');
  });
});

