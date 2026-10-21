export interface ProjectSummary {
  id: string;
  name: string;
  path: string;
  lastOpened: number;
  completedTasks: number;
  totalTasks: number;
  progressPercent: number;
}

export type ActiveTab = 'roadmap' | 'readme';
