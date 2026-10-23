import type { RoadmapModel, PhaseSection, TaskItem } from '$lib/types/roadmap';

/**
 * Analyse une chaîne Markdown pour la convertir en modèle réactif RoadmapModel
 */
export function parseRoadmapMarkdown(markdown: string, defaultTitle = 'Roadmap'): RoadmapModel {
  const lines = markdown.split(/\r?\n/);

  let title = `# Roadmap — ${defaultTitle}`;
  let description = '> Suivi de projet généré et synchronisé par RoadDev';
  const phases: PhaseSection[] = [];

  let currentPhase: PhaseSection | null = null;
  let titleFound = false;
  let descriptionFound = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Titre principal (# ...)
    if (!titleFound && trimmed.startsWith('# ')) {
      title = trimmed;
      titleFound = true;
      continue;
    }

    // 2. Description optionnelle (> ...)
    if (!descriptionFound && trimmed.startsWith('>')) {
      description = trimmed;
      descriptionFound = true;
      continue;
    }

    // 3. En-tête de Phase (## ...)
    if (trimmed.startsWith('## ')) {
      const phaseTitle = trimmed.replace(/^##\s+/, '').trim();
      currentPhase = {
        id: crypto.randomUUID(),
        title: phaseTitle,
        tasks: [],
        isCollapsed: false,
      };
      phases.push(currentPhase);
      continue;
    }

    // 4. Ligne de Tâche (- [ ] ou - [x])
    const taskMatch = trimmed.match(/^[-*]\s*\[([ xX])\]\s*(.*)$/);
    if (taskMatch) {
      const isCompleted = taskMatch[1].toLowerCase() === 'x';
      const taskText = taskMatch[2].trim();

      // Si aucune phase n'a encore été déclarée, créer une phase initiale
      if (!currentPhase) {
        currentPhase = {
          id: crypto.randomUUID(),
          title: 'Phase Initiale',
          tasks: [],
          isCollapsed: false,
        };
        phases.push(currentPhase);
      }

      const task: TaskItem = {
        id: crypto.randomUUID(),
        title: taskText,
        completed: isCompleted,
      };

      currentPhase.tasks.push(task);
    }
  }

  return {
    title,
    description,
    phases,
  };
}
