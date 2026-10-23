<script lang="ts">
  import { ChevronDown, ChevronRight, Plus, Trash2, Edit2, Layers } from '@lucide/svelte';
  import TaskRow from '$lib/components/TaskRow.svelte';
  import type { PhaseSection } from '$lib/types/roadmap';

  interface Props {
    phase: PhaseSection;
    onToggleTask: (phaseId: string, taskId: string) => void;
    onUpdateTaskTitle: (phaseId: string, taskId: string, newTitle: string) => void;
    onDeleteTask: (phaseId: string, taskId: string) => void;
    onAddTask: (phaseId: string, taskTitle: string) => void;
    onUpdatePhaseTitle: (phaseId: string, newTitle: string) => void;
    onDeletePhase: (phaseId: string) => void;
  }

  let {
    phase,
    onToggleTask,
    onUpdateTaskTitle,
    onDeleteTask,
    onAddTask,
    onUpdatePhaseTitle,
    onDeletePhase,
  }: Props = $props();

  let isCollapsed = $state<boolean>(false);
  let newTaskTitle = $state<string>('');
  let isEditingTitle = $state<boolean>(false);
  let editPhaseTitle = $state<string>('');

  $effect(() => {
    isCollapsed = phase.isCollapsed ?? false;
    editPhaseTitle = phase.title;
  });

  let completedCount = $derived(phase.tasks.filter((t) => t.completed).length);
  let totalCount = $derived(phase.tasks.length);
  let percent = $derived(totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0);

  function handleQuickAdd() {
    const trimmed = newTaskTitle.trim();
    if (trimmed) {
      onAddTask(phase.id, trimmed);
      newTaskTitle = '';
    }
  }

  function handleSavePhaseTitle() {
    const trimmed = editPhaseTitle.trim();
    if (trimmed && trimmed !== phase.title) {
      onUpdatePhaseTitle(phase.id, trimmed);
    } else {
      editPhaseTitle = phase.title;
    }
    isEditingTitle = false;
  }
</script>

<div class="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-sm transition-all">
  <!-- Card Header -->
  <div class="p-4 flex items-center justify-between border-b border-slate-800/60 bg-slate-900/40 select-none">
    <div class="flex items-center gap-3 flex-1 min-w-0">
      <!-- Collapse toggle button -->
      <button
        onclick={() => (isCollapsed = !isCollapsed)}
        class="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
        aria-label={isCollapsed ? 'Déplier la phase' : 'Replier la phase'}
      >
        {#if isCollapsed}
          <ChevronRight class="w-4 h-4" />
        {:else}
          <ChevronDown class="w-4 h-4" />
        {/if}
      </button>

      <div class="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
        <Layers class="w-4 h-4" />
      </div>

      <!-- Phase Title -->
      {#if isEditingTitle}
        <input
          type="text"
          bind:value={editPhaseTitle}
          onblur={handleSavePhaseTitle}
          onkeydown={(e) => e.key === 'Enter' && handleSavePhaseTitle()}
          class="flex-1 max-w-sm bg-slate-950 text-white font-semibold text-sm px-2 py-0.5 rounded border border-blue-500 focus:outline-none"
        />
      {:else}
        <div class="flex items-center gap-2 min-w-0">
          <h3
            ondblclick={() => (isEditingTitle = true)}
            class="font-semibold text-sm text-white truncate cursor-pointer hover:text-blue-300 transition-colors"
            title="Double-cliquez pour renommer"
          >
            {phase.title}
          </h3>
          <button
            onclick={() => (isEditingTitle = true)}
            class="opacity-0 hover:opacity-100 p-1 text-slate-500 hover:text-slate-300 rounded cursor-pointer"
            title="Renommer la phase"
          >
            <Edit2 class="w-3 h-3" />
          </button>
        </div>
      {/if}
    </div>

    <!-- Right: Stats Badge + Delete Phase -->
    <div class="flex items-center gap-3 shrink-0">
      <div class="flex items-center gap-2">
        <span class="text-xs font-mono font-medium text-slate-400">
          {completedCount}/{totalCount}
        </span>
        <div class="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            class="bg-blue-500 h-full rounded-full transition-all duration-300"
            style="width: {percent}%"
          ></div>
        </div>
      </div>

      <button
        onclick={() => onDeletePhase(phase.id)}
        class="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
        title="Supprimer cette phase"
      >
        <Trash2 class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>

  <!-- Card Body: Task List & Quick Add Field -->
  {#if !isCollapsed}
    <div class="p-4 space-y-2">
      {#if phase.tasks.length === 0}
        <p class="text-xs text-slate-500 text-center py-3 italic">
          Aucune tâche dans cette phase. Ajoutez-en une ci-dessous.
        </p>
      {:else}
        {#each phase.tasks as task (task.id)}
          <TaskRow
            {task}
            onToggle={(tId) => onToggleTask(phase.id, tId)}
            onUpdateTitle={(tId, newTitle) => onUpdateTaskTitle(phase.id, tId, newTitle)}
            onDelete={(tId) => onDeleteTask(phase.id, tId)}
          />
        {/each}
      {/if}

      <!-- Quick Add Task Bar -->
      <form
        onsubmit={(e) => {
          e.preventDefault();
          handleQuickAdd();
        }}
        class="flex items-center gap-2 pt-2"
      >
        <input
          type="text"
          bind:value={newTaskTitle}
          placeholder="+ Nouvelle tâche..."
          class="flex-1 bg-slate-950/80 text-xs text-slate-200 placeholder-slate-500 px-3 py-2 rounded-xl border border-slate-800/80 focus:border-blue-500 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!newTaskTitle.trim()}
          class="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-40 text-slate-200 text-xs font-medium rounded-xl transition-all cursor-pointer"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Ajouter</span>
        </button>
      </form>
    </div>
  {/if}
</div>
