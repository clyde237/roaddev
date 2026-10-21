<script lang="ts">
  import { Check, Trash2, Edit2 } from '@lucide/svelte';
  import type { TaskItem } from '$lib/types/roadmap';

  interface Props {
    task: TaskItem;
    onToggle: (taskId: string) => void;
    onUpdateTitle: (taskId: string, newTitle: string) => void;
    onDelete: (taskId: string) => void;
  }

  let { task, onToggle, onUpdateTitle, onDelete }: Props = $props();

  let isEditing = $state<boolean>(false);
  let editTitle = $state<string>('');

  $effect(() => {
    editTitle = task.title;
  });

  function handleSaveEdit() {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== task.title) {
      onUpdateTitle(task.id, trimmed);
    } else {
      editTitle = task.title;
    }
    isEditing = false;
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleSaveEdit();
    } else if (event.key === 'Escape') {
      editTitle = task.title;
      isEditing = false;
    }
  }
</script>

<div
  class="group relative flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 transition-all select-none"
>
  <!-- Left: Custom Checkbox + Task Title -->
  <div class="flex items-center gap-3 flex-1 min-w-0">
    <button
      onclick={() => onToggle(task.id)}
      class="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all cursor-pointer {task.completed
        ? 'bg-blue-600 border border-blue-500 text-white shadow-sm shadow-blue-500/20'
        : 'bg-slate-900 border border-slate-700 hover:border-slate-500 text-transparent'}"
      aria-label={task.completed ? 'Marquer comme non fait' : 'Marquer comme fait'}
    >
      <Check class="w-3.5 h-3.5 stroke-[2.5]" />
    </button>

    {#if isEditing}
      <input
        type="text"
        bind:value={editTitle}
        onblur={handleSaveEdit}
        onkeydown={handleKeyDown}
        class="flex-1 bg-slate-900 text-slate-100 text-xs px-2 py-1 rounded border border-blue-500 focus:outline-none font-medium"
      />
    {:else}
      <span
        role="button"
        tabindex="0"
        ondblclick={() => (isEditing = true)}
        onkeydown={(e) => e.key === 'Enter' && (isEditing = true)}
        class="text-xs font-medium cursor-pointer truncate transition-all {task.completed
          ? 'line-through text-slate-500'
          : 'text-slate-200 hover:text-white'}"
        title="Double-cliquez pour modifier"
      >
        {task.title}
      </span>
    {/if}
  </div>

  <!-- Right: Hover Actions (Edit, Delete) -->
  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
    {#if !isEditing}
      <button
        onclick={() => (isEditing = true)}
        class="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
        title="Modifier"
      >
        <Edit2 class="w-3 h-3" />
      </button>
    {/if}

    <button
      onclick={() => onDelete(task.id)}
      class="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
      title="Supprimer"
    >
      <Trash2 class="w-3 h-3" />
    </button>
  </div>
</div>
