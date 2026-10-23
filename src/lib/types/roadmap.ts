export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface PhaseSection {
  id: string;
  title: string;
  tasks: TaskItem[];
  isCollapsed?: boolean;
}

export interface RoadmapModel {
  title: string;
  description: string;
  phases: PhaseSection[];
}
