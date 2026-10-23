import type { RoadmapModel } from '$lib/types/roadmap';

/**
 * Reconstitue un document Markdown standard à partir du modèle RoadmapModel
 */
export function serializeRoadmapMarkdown(roadmap: RoadmapModel): string {
  const chunks: string[] = [];

  // 1. Titre principal
  chunks.push(roadmap.title.startsWith('#') ? roadmap.title : `# ${roadmap.title}`);

  // 2. Description
  if (roadmap.description) {
    chunks.push(roadmap.description.startsWith('>') ? roadmap.description : `> ${roadmap.description}`);
  }

  chunks.push(''); // Ligne vide

  // 3. Phases et Tâches
  for (let i = 0; i < roadmap.phases.length; i++) {
    const phase = roadmap.phases[i];
    chunks.push(`## ${phase.title}`);

    if (phase.tasks.length === 0) {
      // Phase vide : laisser une ligne ou continuer
    } else {
      for (const task of phase.tasks) {
        const checkbox = task.completed ? '- [x]' : '- [ ]';
        chunks.push(`${checkbox} ${task.title}`);
      }
    }

    // Séparateur entre les phases
    if (i < roadmap.phases.length - 1) {
      chunks.push('');
    }
  }

  chunks.push(''); // Fin de fichier avec saut de ligne
  return chunks.join('\n');
}
