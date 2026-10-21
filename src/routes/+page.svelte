<script lang="ts">
  import { onMount } from 'svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import Header from '$lib/components/Header.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ReadmeViewer from '$lib/components/ReadmeViewer.svelte';
  import type { ActiveTab, ProjectSummary } from '$lib/types/project';
  import { open } from '@tauri-apps/plugin-dialog';
  import {
    loadRecentProjects,
    saveRecentProjects,
    loadActiveProjectId,
    saveActiveProjectId,
  } from '$lib/services/storage';
  import {
    detectReadme,
    saveReadme,
    createDefaultReadme,
    computeRoadmapStats,
    type ReadmeDetectionResult,
  } from '$lib/services/projectService';

  // Svelte 5 Runes for reactive state
  let projects = $state<ProjectSummary[]>([]);
  let activeProjectId = $state<string | null>(null);
  let activeTab = $state<ActiveTab>('roadmap');
  let isGenerating = $state<boolean>(false);
  let isRefreshing = $state<boolean>(false);

  // README state
  let readmeData = $state<ReadmeDetectionResult>({
    exists: false,
    filename: null,
    fullPath: null,
    content: '',
  });

  // Derived state for the active project
  let activeProject = $derived<ProjectSummary | null>(
    projects.find((p) => p.id === activeProjectId) || null
  );

  onMount(async () => {
    // Charge les projets sauvegardés au démarrage
    const storedProjects = await loadRecentProjects();
    projects = storedProjects;

    const storedActiveId = await loadActiveProjectId();
    if (storedActiveId && projects.some((p) => p.id === storedActiveId)) {
      activeProjectId = storedActiveId;
    } else if (projects.length > 0) {
      activeProjectId = projects[0].id;
    }

    if (activeProject) {
      await loadProjectData(activeProject);
    }
  });

  async function loadProjectData(project: ProjectSummary) {
    try {
      // 1. Détection du README
      readmeData = await detectReadme(project.path);

      // 2. Calcul des statistiques de ROADMAP
      const stats = await computeRoadmapStats(project.path);
      project.completedTasks = stats.completedTasks;
      project.totalTasks = stats.totalTasks;
      project.progressPercent = stats.progressPercent;

      // Sauvegarde des stats mises à jour
      await saveRecentProjects(projects);
    } catch (err) {
      console.error('Erreur chargement données projet:', err);
    }
  }

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
          await loadProjectData(existing);
        } else {
          // Calcul initial des stats
          const stats = await computeRoadmapStats(path);

          const newProject: ProjectSummary = {
            id: crypto.randomUUID(),
            name,
            path,
            lastOpened: Date.now(),
            completedTasks: stats.completedTasks,
            totalTasks: stats.totalTasks,
            progressPercent: stats.progressPercent,
          };

          projects = [newProject, ...projects];
          activeProjectId = newProject.id;
          await loadProjectData(newProject);
        }

        await saveRecentProjects(projects);
        await saveActiveProjectId(activeProjectId);
      }
    } catch (err) {
      console.error('Erreur lors de la sélection du dossier:', err);
    }
  }

  async function handleSelectProject(project: ProjectSummary) {
    activeProjectId = project.id;
    await saveActiveProjectId(activeProjectId);
    await loadProjectData(project);
  }

  async function handleRemoveProject(id: string) {
    projects = projects.filter((p) => p.id !== id);
    await saveRecentProjects(projects);

    if (activeProjectId === id) {
      activeProjectId = projects.length > 0 ? projects[0].id : null;
      await saveActiveProjectId(activeProjectId);
      if (activeProject) {
        await loadProjectData(activeProject);
      }
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

  async function handleRefresh() {
    if (!activeProject) return;
    isRefreshing = true;
    try {
      await loadProjectData(activeProject);
    } finally {
      setTimeout(() => {
        isRefreshing = false;
      }, 400);
    }
  }

  async function handleSaveReadme(newContent: string) {
    if (!readmeData.fullPath) return;
    await saveReadme(readmeData.fullPath, newContent);
    readmeData.content = newContent;
  }

  async function handleCreateReadme() {
    if (!activeProject) return;
    const created = await createDefaultReadme(activeProject.path, activeProject.name);
    readmeData = created;
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
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-base font-semibold text-white">Suivi Roadmap — {activeProject.name}</h3>
              <span class="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {activeProject.progressPercent}% complété
              </span>
            </div>
            <p class="text-xs text-slate-400">
              Le moteur de synchronisation bidirectionnelle temps réel (<code class="text-slate-300">ROADMAP.md</code>) sera activé au Sprint 3. Vous pouvez d'ores et déjà consulter et éditer la documentation de votre projet dans l'onglet <strong>README.md</strong>.
            </p>
          </div>
        </div>
      {:else}
        <!-- Onglet README.md avec Visualiseur & Éditeur rapide -->
        <div class="h-full max-w-4xl mx-auto">
          <ReadmeViewer
            content={readmeData.content}
            filename={readmeData.filename}
            hasReadme={readmeData.exists}
            onSave={handleSaveReadme}
            onCreateReadme={handleCreateReadme}
          />
        </div>
      {/if}
    </main>
  </div>
</div>
