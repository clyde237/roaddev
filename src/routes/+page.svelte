<script lang="ts">
  import { onMount } from 'svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import Header from '$lib/components/Header.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ReadmeViewer from '$lib/components/ReadmeViewer.svelte';
  import RoadmapView from '$lib/components/RoadmapView.svelte';
  import type { ActiveTab, ProjectSummary } from '$lib/types/project';
  import type { RoadmapModel } from '$lib/types/roadmap';
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
    type ReadmeDetectionResult,
  } from '$lib/services/projectService';
  import {
    loadRoadmap,
    syncRoadmapToDisk,
    calculateRoadmapProgress,
  } from '$lib/services/roadmapSync';

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

  // Roadmap state
  let roadmapData = $state<RoadmapModel>({
    title: '',
    description: '',
    phases: [],
  });
  let roadmapFullPath = $state<string>('');

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
      // 1. Détection et chargement du README
      readmeData = await detectReadme(project.path);

      // 2. Chargement du ROADMAP.md
      const roadmapResult = await loadRoadmap(project.path, project.name);
      roadmapData = roadmapResult.roadmap;
      roadmapFullPath = roadmapResult.fullPath;

      // 3. Calcul des statistiques de ROADMAP
      const stats = calculateRoadmapProgress(roadmapData);
      project.completedTasks = stats.completed;
      project.totalTasks = stats.total;
      project.progressPercent = stats.percent;

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
          // Chargement initial du roadmap
          const roadmapResult = await loadRoadmap(path, name);
          const stats = calculateRoadmapProgress(roadmapResult.roadmap);

          const newProject: ProjectSummary = {
            id: crypto.randomUUID(),
            name,
            path,
            lastOpened: Date.now(),
            completedTasks: stats.completed,
            totalTasks: stats.total,
            progressPercent: stats.percent,
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

  /**
   * Synchronisation bidirectionnelle atomique (< 15ms)
   */
  async function handleUpdateRoadmap(updated: RoadmapModel) {
    roadmapData = updated;

    if (activeProject && roadmapFullPath) {
      // 1. Écriture atomique sur le disque
      await syncRoadmapToDisk(roadmapFullPath, updated);

      // 2. Recalcul immédiat des statistiques
      const stats = calculateRoadmapProgress(updated);
      activeProject.completedTasks = stats.completed;
      activeProject.totalTasks = stats.total;
      activeProject.progressPercent = stats.percent;

      // 3. Sauvegarde de la progression du projet
      await saveRecentProjects(projects);
    }
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
        <!-- Onglet Roadmap Interactive -->
        <RoadmapView
          roadmap={roadmapData}
          projectName={activeProject.name}
          onUpdateRoadmap={handleUpdateRoadmap}
          onTriggerAIGenerate={handleGenerateAI}
        />
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
