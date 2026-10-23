import { Store } from '@tauri-apps/plugin-store';
import type { ProjectSummary } from '$lib/types/project';

const STORE_FILENAME = 'roaddev-storage.json';
const PROJECTS_KEY = 'recent_projects';
const ACTIVE_PROJECT_KEY = 'active_project_id';

let storeInstance: Store | null = null;

async function getStore(): Promise<Store | null> {
  if (storeInstance) {
    return storeInstance;
  }

  try {
    storeInstance = await Store.load(STORE_FILENAME);
    return storeInstance;
  } catch (err) {
    console.warn('Tauri Store unavailable, using localStorage fallback:', err);
    return null;
  }
}

export async function loadRecentProjects(): Promise<ProjectSummary[]> {
  try {
    const store = await getStore();
    if (store) {
      const projects = await store.get<ProjectSummary[]>(PROJECTS_KEY);
      return projects || [];
    }
  } catch (err) {
    console.error('Error loading projects from Tauri Store:', err);
  }

  // Fallback localStorage
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveRecentProjects(projects: ProjectSummary[]): Promise<void> {
  try {
    const store = await getStore();
    if (store) {
      await store.set(PROJECTS_KEY, projects);
      await store.save();
    }
  } catch (err) {
    console.error('Error saving projects to Tauri Store:', err);
  }

  // Fallback localStorage
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch (err) {
    console.error('Error saving projects to localStorage:', err);
  }
}

export async function loadActiveProjectId(): Promise<string | null> {
  try {
    const store = await getStore();
    if (store) {
      const activeId = await store.get<string>(ACTIVE_PROJECT_KEY);
      return activeId ?? null;
    }
  } catch (err) {
    console.error('Error loading active project id from Tauri Store:', err);
  }

  // Fallback localStorage
  try {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  } catch {
    return null;
  }
}

export async function saveActiveProjectId(id: string | null): Promise<void> {
  try {
    const store = await getStore();
    if (store) {
      await store.set(ACTIVE_PROJECT_KEY, id);
      await store.save();
    }
  } catch (err) {
    console.error('Error saving active project id to Tauri Store:', err);
  }

  // Fallback localStorage
  try {
    if (id) {
      localStorage.setItem(ACTIVE_PROJECT_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  } catch (err) {
    console.error('Error saving active project id to localStorage:', err);
  }
}
