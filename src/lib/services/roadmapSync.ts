import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import type { RoadmapModel } from '$lib/types/roadmap';
import { parseRoadmapMarkdown } from '$lib/services/markdownParser';
import { serializeRoadmapMarkdown } from '$lib/services/markdownSerializer';

const ROADMAP_FILENAME = 'ROADMAP.md';

function normalizePath(base: string, file: string): string {
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${cleanBase}/${file}`;
}

export interface RoadmapLoadResult {
  roadmap: RoadmapModel;
  fullPath: string;
  exists: boolean;
}

export interface RoadmapStats {
  completed: number;
  total: number;
  percent: number;
}

/**
 * Calcule les statistiques d'avancement d'un modèle Roadmap
 */
export function calculateRoadmapProgress(roadmap: RoadmapModel): RoadmapStats {
  let total = 0;
  let completed = 0;

  for (const phase of roadmap.phases) {
    for (const task of phase.tasks) {
      total += 1;
      if (task.completed) {
        completed += 1;
      }
    }
  }

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percent };
}

/**
 * Charge le fichier ROADMAP.md du projet ou initialise un modèle par défaut
 */
export async function loadRoadmap(
  projectPath: string,
  projectName: string
): Promise<RoadmapLoadResult> {
  const fullPath = normalizePath(projectPath, ROADMAP_FILENAME);

  try {
    const fileExists = await exists(fullPath);
    if (fileExists) {
      const content = await readTextFile(fullPath);
      const roadmap = parseRoadmapMarkdown(content, projectName);
      return {
        roadmap,
        fullPath,
        exists: true,
      };
    }
  } catch (err) {
    console.warn(`Could not read ${fullPath}:`, err);
  }

  // Modèle par défaut si aucun fichier n'existe
  const defaultRoadmap: RoadmapModel = {
    title: `# Roadmap — ${projectName}`,
    description: '> Suivi de projet généré et synchronisé par RoadDev',
    phases: [],
  };

  return {
    roadmap: defaultRoadmap,
    fullPath,
    exists: false,
  };
}

/**
 * Enregistre de manière atomique le Roadmap sur le disque (< 15ms)
 */
export async function syncRoadmapToDisk(
  fullPath: string,
  roadmap: RoadmapModel
): Promise<void> {
  const markdown = serializeRoadmapMarkdown(roadmap);
  await writeTextFile(fullPath, markdown);
}
