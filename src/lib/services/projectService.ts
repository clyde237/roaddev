import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

const README_CANDIDATES = [
  'README.md',
  'readme.md',
  'Readme.md',
  'README.markdown',
  'README.txt',
  'README',
];

const ROADMAP_CANDIDATES = [
  'ROADMAP.md',
  'roadmap.md',
  'Roadmap.md',
  'TODO.md',
  'todo.md',
];

function normalizePath(base: string, file: string): string {
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${cleanBase}/${file}`;
}

export interface ReadmeDetectionResult {
  exists: boolean;
  filename: string | null;
  fullPath: string | null;
  content: string;
}

export interface RoadmapStatsResult {
  roadmapExists: boolean;
  filename: string | null;
  fullPath: string | null;
  completedTasks: number;
  totalTasks: number;
  progressPercent: number;
}

/**
 * Détecte la présence d'un fichier README dans le dossier du projet
 */
export async function detectReadme(projectPath: string): Promise<ReadmeDetectionResult> {
  for (const filename of README_CANDIDATES) {
    const fullPath = normalizePath(projectPath, filename);
    try {
      const fileExists = await exists(fullPath);
      if (fileExists) {
        const content = await readTextFile(fullPath);
        return {
          exists: true,
          filename,
          fullPath,
          content,
        };
      }
    } catch (err) {
      console.warn(`Could not check candidate ${fullPath}:`, err);
    }
  }

  return {
    exists: false,
    filename: null,
    fullPath: null,
    content: '',
  };
}

/**
 * Sauvegarde le contenu du README sur le disque
 */
export async function saveReadme(fullPath: string, content: string): Promise<void> {
  await writeTextFile(fullPath, content);
}

/**
 * Crée un fichier README.md par défaut si le projet n'en a pas
 */
export async function createDefaultReadme(
  projectPath: string,
  projectName: string
): Promise<ReadmeDetectionResult> {
  const filename = 'README.md';
  const fullPath = normalizePath(projectPath, filename);
  const template = `# ${projectName}

## Description
Bienvenue dans le projet ${projectName}.

## Objectifs
- [ ] Mettre en place l'architecture
- [ ] Développer les fonctionnalités clés
- [ ] Tester et déployer

## Guide de Démarrage
Décrivez ici les commandes d'installation et de lancement de votre projet.
`;

  await writeTextFile(fullPath, template);

  return {
    exists: true,
    filename,
    fullPath,
    content: template,
  };
}

/**
 * Détecte et analyse le fichier ROADMAP.md pour calculer les statistiques d'avancement
 */
export async function computeRoadmapStats(projectPath: string): Promise<RoadmapStatsResult> {
  for (const filename of ROADMAP_CANDIDATES) {
    const fullPath = normalizePath(projectPath, filename);
    try {
      const fileExists = await exists(fullPath);
      if (fileExists) {
        const content = await readTextFile(fullPath);
        const lines = content.split('\n');

        let total = 0;
        let completed = 0;

        for (const line of lines) {
          const match = line.match(/^[\s]*-\s*\[([ xX])\]/);
          if (match) {
            total += 1;
            if (match[1].toLowerCase() === 'x') {
              completed += 1;
            }
          }
        }

        const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          roadmapExists: true,
          filename,
          fullPath,
          completedTasks: completed,
          totalTasks: total,
          progressPercent,
        };
      }
    } catch (err) {
      console.warn(`Could not check roadmap candidate ${fullPath}:`, err);
    }
  }

  return {
    roadmapExists: false,
    filename: null,
    fullPath: null,
    completedTasks: 0,
    totalTasks: 0,
    progressPercent: 0,
  };
}
