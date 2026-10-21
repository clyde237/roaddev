<script lang="ts">
  import Sidebar from '$lib/components/Sidebar.svelte';
  import Header from '$lib/components/Header.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import type { ActiveTab, ProjectSummary } from '$lib/types/project';
  import { open } from '@tauri-apps/plugin-dialog';

  // Svelte 5 Runes for reactive state
  let projects = $state<ProjectSummary[]>([]);
  let activeProjectId = $state<string | null>(null);
  let activeTab = $state<ActiveTab>('roadmap');
  let isGenerating = $state<boolean>(false);
  let isRefreshing = $state<boolean>(false);

  // Derived state for the active project
  let activeProject = $derived<ProjectSummary | null>(
    projects.find((p) => p.id === activeProjectId) || null
  );

  async function handleOpenProject() {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Sélectionner le dossier du projet',
      });

      if (selected && typeof selected === 'string') {
        const path = selected;
        const name = path.split('/').filter(Boolean).pop() || 'Projet';

        const existing = projects.find((p) => p.path === path);
        if (existing) {
          existing.lastOpened = Date.now();
          activeProjectId = existing.id;
        } else {
          const newProject: ProjectSummary = {
            id: crypto.randomUUID(),
            name,
            path,
            lastOpened: Date.now(),
            completedTasks: 0,
            totalTasks: 0,
            progressPercent: 0,
          };
          projects = [newProject, ...projects];
          activeProjectId = newProject.id;
        }
      }
    } catch (err) {
      console.error('Erreur lors de la sélection du dossier:', err);
    }
  }

  function handleSelectProject(project: ProjectSummary) {
    activeProjectId = project.id;
  }

  function handleRemoveProject(id: string) {
    projects = projects.filter((p) => p.id !== id);
    if (activeProjectId === id) {
      activeProjectId = projects.length > 0 ? projects[0].id : null;
    }
  }

  function handleOpenSettings() {
    alert('Paramètres API (Sprint 4)');
  }

  function handleTabChange(tab: ActiveTab) {
    activeTab = tab;
  }

  function handleGenerateAI() {
    isGenerating = true;
    setTimeout(() => {
      isGenerating = false;
    }, 1500);
  }

  function handleRefresh() {
    isRefreshing = true;
    setTimeout(() => {
      isRefreshing = false;
    }, 600);
  }
</script>

<div class="flex h-full w-full overflow-hidden">
  <!-- Zone 1: Sidebar Gauche (260px fixe) -->
  <Sidebar
    {projects}
    {activeProjectId}
    onOpenProject={handleOpenProject}
    onSelectProject={handleSelectProject}
    onRemoveProject={handleRemoveProject}
    onOpenSettings={handleOpenSettings}
  />

  <!-- Main Container -->
  <div class="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
    <!-- Zone 2: Barre Supérieure (Header) -->
    <Header
      project={activeProject}
      {activeTab}
      {isGenerating}
      {isRefreshing}
      onTabChange={handleTabChange}
      onGenerateAI={handleGenerateAI}
      onRefresh={handleRefresh}
    />

    <!-- Zone 3: Workspace Central (Scrollable) -->
    <main class="flex-1 overflow-y-auto p-6">
      {#if !activeProject}
        <EmptyState onOpenProject={handleOpenProject} />
      {:else if activeTab === 'roadmap'}
        <div class="max-w-4xl mx-auto space-y-6">
          <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h3 class="text-base font-semibold text-white mb-2">Suivi Roadmap — {activeProject.name}</h3>
            <p class="text-xs text-slate-400">
              L'analyseur et le moteur de synchronisation bidirectionnelle Markdown seront branchés dans les Sprints 2 & 3.
            </p>
          </div>
        </div>
      {:else}
        <div class="max-w-4xl mx-auto space-y-6">
          <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h3 class="text-base font-semibold text-white mb-2">Aperçu README.md — {activeProject.name}</h3>
            <p class="text-xs text-slate-400">
              Le visualiseur Markdown natif sera intégré au Sprint 2.
            </p>
          </div>
        </div>
      {/if}
    </main>
  </div>
</div>
