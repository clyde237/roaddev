<script lang="ts">
  import { onMount } from 'svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import Header from '$lib/components/Header.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ReadmeViewer from '$lib/components/ReadmeViewer.svelte';
  import RoadmapView from '$lib/components/RoadmapView.svelte';
  import SettingsModal from '$lib/components/SettingsModal.svelte';
  import ConflictModal from '$lib/components/ConflictModal.svelte';
  import { AlertCircle, CheckCircle2 } from '@lucide/svelte';
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
  import {
    loadAISettings,
    saveAISettings,
    DEFAULT_AI_SETTINGS,
    type AISettings,
  } from '$lib/services/aiSettings';
  import {
    generateRoadmapFromReadme,
    mergeRoadmaps,
  } from '$lib/services/aiGenerator';

  // Svelte 5 Runes for reactive state
  let projects = $state<ProjectSummary[]>([]);
  let activeProjectId = $state<string | null>(null);
  let activeTab = $state<ActiveTab>('roadmap');
  let isGenerating = $state<boolean>(false);
  let isRefreshing = $state<boolean>(false);

  // Modals & AI State
  let aiSettings = $state<AISettings>(DEFAULT_AI_SETTINGS);
  let isSettingsModalOpen = $state<boolean>(false);
  let isConflictModalOpen = $state<boolean>(false);
  let pendingGeneratedRoadmap = $state<RoadmapModel | null>(null);
  let toastMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

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

  function showToast(text: string, type: 'success' | 'error' = 'success', duration = 3500) {
    toastMessage = { type, text };
    setTimeout(() => {
      toastMessage = null;
    }, duration);
  }

  onMount(async () => {
    // 1. Charge les paramètres d'IA
    aiSettings = await loadAISettings();

    // 2. Charge les projets sauvegardés au démarrage
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
    isSettingsModalOpen = true;
  }

  async function handleSaveSettings(newSettings: AISettings) {
    aiSettings = newSettings;
    await saveAISettings(newSettings);
    showToast('Paramètres d’IA enregistrés avec succès !');
  }

  function handleTabChange(tab: ActiveTab) {
    activeTab = tab;
  }

  /**
   * Pipeline de Génération par IA
   */
  async function handleGenerateAI() {
    if (!activeProject) {
      showToast('Veuillez ouvrir un projet pour lancer la génération.', 'error');
      return;
    }

    // Recharge dynamiquement les derniers paramètres enregistrés
    aiSettings = await loadAISettings();

    // Vérification de la clé API
    const hasKey =
      aiSettings.provider === 'openrouter'
        ? !!aiSettings.openrouterKey && aiSettings.openrouterKey.trim().length > 0
        : aiSettings.provider === 'gemini'
        ? !!aiSettings.geminiKey && aiSettings.geminiKey.trim().length > 0
        : !!aiSettings.mistralKey && aiSettings.mistralKey.trim().length > 0;

    if (!hasKey) {
      const providerLabel =
        aiSettings.provider === 'openrouter'
          ? 'OpenRouter'
          : aiSettings.provider === 'gemini'
          ? 'Google AI Studio'
          : 'Mistral AI';
      showToast(
        `Clé API ${providerLabel} manquante. Veuillez la configurer dans les Paramètres (icône en bas de la barre latérale).`,
        'error',
        6000
      );
      return;
    }

    isGenerating = true;
    try {
      const generated = await generateRoadmapFromReadme(
        activeProject.name,
        readmeData.content,
        aiSettings
      );

      // Si le projet a déjà des tâches, afficher la modale de résolution de conflit
      const hasExistingTasks =
        roadmapData.phases.length > 0 &&
        roadmapData.phases.some((phase) => phase.tasks.length > 0);

      if (hasExistingTasks) {
        pendingGeneratedRoadmap = generated;
        isConflictModalOpen = true;
      } else {
        await handleUpdateRoadmap(generated);
        activeTab = 'roadmap';
        showToast('Roadmap générée avec succès par l’IA !');
      }
    } catch (err: any) {
      console.error('Erreur génération IA:', err);
      showToast(err.message || 'Erreur lors de la génération IA.', 'error', 6000);
    } finally {
      isGenerating = false;
    }
  }

  async function handleOverwriteConflict() {
    if (pendingGeneratedRoadmap) {
      await handleUpdateRoadmap(pendingGeneratedRoadmap);
      isConflictModalOpen = false;
      pendingGeneratedRoadmap = null;
      activeTab = 'roadmap';
      showToast('Roadmap écrasée et mise à jour avec succès !');
    }
  }

  async function handleMergeConflict() {
    if (pendingGeneratedRoadmap) {
      const merged = mergeRoadmaps(roadmapData, pendingGeneratedRoadmap);
      await handleUpdateRoadmap(merged);
      isConflictModalOpen = false;
      pendingGeneratedRoadmap = null;
      activeTab = 'roadmap';
      showToast('Roadmap complétée avec succès !');
    }
  }

  function handleCancelConflict() {
    isConflictModalOpen = false;
    pendingGeneratedRoadmap = null;
  }

  async function handleRefresh() {
    if (!activeProject) return;
    isRefreshing = true;
    try {
      await loadProjectData(activeProject);
      showToast('Données synchronisées depuis le disque.');
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
    showToast('Fichier README.md créé avec succès.');
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

  function handleGlobalKeyDown(event: KeyboardEvent) {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;

    // Raccourci Escape : ferme les modales ouvertes
    if (event.key === 'Escape') {
      if (isSettingsModalOpen) {
        isSettingsModalOpen = false;
        return;
      }
      if (isConflictModalOpen) {
        isConflictModalOpen = false;
        return;
      }
    }

    const target = event.target as HTMLElement | null;
    const isTyping =
      target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

    if (isCtrlOrCmd) {
      if (event.key.toLowerCase() === 'o') {
        event.preventDefault();
        handleOpenProject();
      } else if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        handleRefresh();
      } else if (event.key === ',') {
        event.preventDefault();
        handleOpenSettings();
      } else if (event.key === '1' && !isTyping) {
        event.preventDefault();
        handleTabChange('roadmap');
      } else if (event.key === '2' && !isTyping) {
        event.preventDefault();
        handleTabChange('readme');
      }
    }
  }
</script>

<svelte:window onkeydown={handleGlobalKeyDown} />

<div class="flex h-full w-full overflow-hidden relative">
  <!-- Toast Feedback Notification -->
  {#if toastMessage}
    <div
      class="absolute top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border shadow-xl text-xs font-medium backdrop-blur-md transition-all {toastMessage.type === 'success'
        ? 'bg-slate-900/90 border-emerald-500/30 text-emerald-300'
        : 'bg-slate-900/90 border-red-500/30 text-red-300'}"
    >
      {#if toastMessage.type === 'success'}
        <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" />
      {:else}
        <AlertCircle class="w-4 h-4 text-red-400 shrink-0" />
      {/if}
      <span>{toastMessage.text}</span>
    </div>
  {/if}

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

  <!-- Modal des Paramètres d'IA -->
  <SettingsModal
    settings={aiSettings}
    isOpen={isSettingsModalOpen}
    onClose={() => (isSettingsModalOpen = false)}
    onSave={handleSaveSettings}
  />

  <!-- Modal de Résolution de Conflit -->
  <ConflictModal
    isOpen={isConflictModalOpen}
    projectName={activeProject?.name || ''}
    existingTasksCount={activeProject?.totalTasks || 0}
    onOverwrite={handleOverwriteConflict}
    onMerge={handleMergeConflict}
    onCancel={handleCancelConflict}
  />
</div>
