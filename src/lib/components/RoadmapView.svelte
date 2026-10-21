<script lang="ts">
  import { Plus, Sparkles, ListChecks, CheckCircle2, AlertCircle, FileText, Copy, Check } from '@lucide/svelte';
  import PhaseCard from '$lib/components/PhaseCard.svelte';
  import type { RoadmapModel } from '$lib/types/roadmap';
  import { calculateRoadmapProgress } from '$lib/services/roadmapSync';

  interface Props {
    roadmap: RoadmapModel;
    projectName: string;
    roadmapPath?: string;
    onUpdateRoadmap: (updated: RoadmapModel) => Promise<void>;
    onTriggerAIGenerate: () => void;
  }

  let { roadmap, projectName, roadmapPath = '', onUpdateRoadmap, onTriggerAIGenerate }: Props = $props();

  let stats = $derived(calculateRoadmapProgress(roadmap));
  let isAddingPhase = $state<boolean>(false);
  let newPhaseTitle = $state<string>('');
  let copiedPath = $state<boolean>(false);

  async function copyRoadmapPath() {
    if (!roadmapPath) return;
    try {
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
      await writeText(roadmapPath);
      copiedPath = true;
    } catch {
      try {
        await navigator.clipboard.writeText(roadmapPath);
        copiedPath = true;
      } catch (err) {
        console.warn('Erreur copie presse-papier:', err);
      }
    }
    setTimeout(() => {
      copiedPath = false;
    }, 2000);
  }

  async function handleToggleTask(phaseId: string, taskId: string) {
    const updatedPhases = roadmap.phases.map((phase) => {
      if (phase.id !== phaseId) return phase;
      return {
        ...phase,
        tasks: phase.tasks.map((task) => {
          if (task.id !== taskId) return task;
          return { ...task, completed: !task.completed };
        }),
      };
    });

    await onUpdateRoadmap({
      ...roadmap,
      phases: updatedPhases,
    });
  }

  async function handleUpdateTaskTitle(phaseId: string, taskId: string, newTitle: string) {
    const updatedPhases = roadmap.phases.map((phase) => {
      if (phase.id !== phaseId) return phase;
      return {
        ...phase,
        tasks: phase.tasks.map((task) => {
          if (task.id !== taskId) return task;
          return { ...task, title: newTitle };
        }),
      };
    });

    await onUpdateRoadmap({
      ...roadmap,
      phases: updatedPhases,
    });
  }

  async function handleDeleteTask(phaseId: string, taskId: string) {
    const updatedPhases = roadmap.phases.map((phase) => {
      if (phase.id !== phaseId) return phase;
      return {
        ...phase,
        tasks: phase.tasks.filter((task) => task.id !== taskId),
      };
    });

    await onUpdateRoadmap({
      ...roadmap,
      phases: updatedPhases,
    });
  }

  async function handleAddTask(phaseId: string, taskTitle: string) {
    const updatedPhases = roadmap.phases.map((phase) => {
      if (phase.id !== phaseId) return phase;
      return {
        ...phase,
        tasks: [
          ...phase.tasks,
          {
            id: crypto.randomUUID(),
            title: taskTitle,
            completed: false,
          },
        ],
      };
    });

    await onUpdateRoadmap({
      ...roadmap,
      phases: updatedPhases,
    });
  }

  async function handleUpdatePhaseTitle(phaseId: string, newTitle: string) {
    const updatedPhases = roadmap.phases.map((phase) => {
      if (phase.id !== phaseId) return phase;
      return { ...phase, title: newTitle };
    });

    await onUpdateRoadmap({
      ...roadmap,
      phases: updatedPhases,
    });
  }

  async function handleDeletePhase(phaseId: string) {
    const updatedPhases = roadmap.phases.filter((phase) => phase.id !== phaseId);
    await onUpdateRoadmap({
      ...roadmap,
      phases: updatedPhases,
    });
  }

  async function handleCreatePhase() {
    const trimmed = newPhaseTitle.trim();
    if (!trimmed) return;

    const newPhase = {
      id: crypto.randomUUID(),
      title: trimmed,
      tasks: [],
      isCollapsed: false,
    };

    newPhaseTitle = '';
    isAddingPhase = false;

    await onUpdateRoadmap({
      ...roadmap,
      phases: [...roadmap.phases, newPhase],
    });
  }
</script>

<div class="max-w-4xl mx-auto space-y-6">
  <!-- Top Progress Banner -->
  <div class="p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-lg font-bold text-white flex items-center gap-2">
          <span>Roadmap</span>
          <span class="text-slate-400 font-normal">— {projectName}</span>
        </h2>
        {#if roadmapPath}
          <div class="flex items-center gap-2 mt-2 flex-wrap">
            <span class="text-xs text-slate-400">Emplacement :</span>
            <span class="text-xs font-mono text-emerald-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5 select-text">
              <FileText class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span class="truncate max-w-md">{roadmapPath}</span>
            </span>
            <button
              type="button"
              onclick={copyRoadmapPath}
              class="p-1 px-2 text-[11px] bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
              title="Copier le chemin absolu du fichier ROADMAP.md"
            >
              {#if copiedPath}
                <Check class="w-3 h-3 text-emerald-400" />
                <span class="text-emerald-400 font-medium">Copié !</span>
              {:else}
                <Copy class="w-3 h-3 text-slate-400" />
                <span>Copier le chemin</span>
              {/if}
            </button>
          </div>
        {:else}
          <p class="text-xs text-slate-400 mt-1">
            Synchronisation bidirectionnelle native avec <code class="text-blue-400 font-mono text-[11px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">ROADMAP.md</code>
          </p>
        {/if}
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <button
          onclick={() => (isAddingPhase = true)}
          class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-xs font-medium rounded-xl transition-all cursor-pointer"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Nouvelle Phase</span>
        </button>

        <button
          onclick={onTriggerAIGenerate}
          class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-medium rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Sparkles class="w-3.5 h-3.5" />
          <span>Générer par IA</span>
        </button>
      </div>
    </div>

    <!-- Global Progress Bar -->
    <div class="space-y-2">
      <div class="flex items-center justify-between text-xs font-medium">
        <span class="text-slate-400">Progression globale</span>
        <span class="text-white font-mono">{stats.percent}% ({stats.completed}/{stats.total} tâches)</span>
      </div>
      <div class="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/80">
        <div
          class="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full transition-all duration-300"
          style="width: {stats.percent}%"
        ></div>
      </div>
    </div>
  </div>

  <!-- Formulaire d'ajout de nouvelle phase -->
  {#if isAddingPhase}
    <div class="p-4 rounded-2xl bg-slate-900 border border-blue-500/40 space-y-3">
      <h4 class="text-xs font-semibold text-white">Ajouter une nouvelle phase</h4>
      <div class="flex items-center gap-2">
        <input
          type="text"
          bind:value={newPhaseTitle}
          placeholder="Ex: Phase 3 : Tests & Déploiement"
          onkeydown={(e) => e.key === 'Enter' && handleCreatePhase()}
          class="flex-1 bg-slate-950 text-xs text-slate-200 px-3 py-2 rounded-xl border border-slate-800 focus:border-blue-500 focus:outline-none"
        />
        <button
          onclick={handleCreatePhase}
          disabled={!newPhaseTitle.trim()}
          class="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium rounded-xl transition-all cursor-pointer"
        >
          Créer la phase
        </button>
        <button
          onclick={() => {
            isAddingPhase = false;
            newPhaseTitle = '';
          }}
          class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs rounded-xl transition-all cursor-pointer"
        >
          Annuler
        </button>
      </div>
    </div>
  {/if}

  <!-- Phase Cards List -->
  {#if roadmap.phases.length === 0}
    <div class="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 max-w-md mx-auto">
      <div class="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 w-fit mx-auto mb-4">
        <ListChecks class="w-8 h-8" />
      </div>
      <h3 class="text-base font-semibold text-white">Aucune tâche enregistrée</h3>
      <p class="text-xs text-slate-400 mt-1.5 mb-6">
        Ce projet n'a pas encore de roadmap. Vous pouvez laisser l'IA analyser votre README pour la découper automatiquement, ou créer vos phases manuellement.
      </p>
      <div class="flex items-center justify-center gap-3">
        <button
          onclick={() => (isAddingPhase = true)}
          class="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-all cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          <span>Créer manuellement</span>
        </button>

        <button
          onclick={onTriggerAIGenerate}
          class="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Sparkles class="w-4 h-4" />
          <span>Générer par IA</span>
        </button>
      </div>
    </div>
  {:else}
    <div class="space-y-4">
      {#each roadmap.phases as phase (phase.id)}
        <PhaseCard
          {phase}
          onToggleTask={handleToggleTask}
          onUpdateTaskTitle={handleUpdateTaskTitle}
          onDeleteTask={handleDeleteTask}
          onAddTask={handleAddTask}
          onUpdatePhaseTitle={handleUpdatePhaseTitle}
          onDeletePhase={handleDeletePhase}
        />
      {/each}
    </div>
  {/if}
</div>
