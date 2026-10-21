<script lang="ts">
  import { Sparkles, RefreshCw, ListTodo, FileText, FolderGit2 } from '@lucide/svelte';
  import type { ActiveTab, ProjectSummary } from '$lib/types/project';

  interface Props {
    project: ProjectSummary | null;
    activeTab: ActiveTab;
    isGenerating?: boolean;
    isRefreshing?: boolean;
    onTabChange: (tab: ActiveTab) => void;
    onGenerateAI: () => void;
    onRefresh: () => void;
  }

  let {
    project,
    activeTab,
    isGenerating = false,
    isRefreshing = false,
    onTabChange,
    onGenerateAI,
    onRefresh,
  }: Props = $props();
</script>

<header class="h-14 bg-slate-900/80 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 select-none backdrop-blur-sm">
  {#if project}
    <!-- Left: Project Name and Path -->
    <div class="flex items-center gap-3 min-w-0">
      <div class="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
        <FolderGit2 class="w-4 h-4" />
      </div>
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h2 class="font-semibold text-sm text-white truncate">{project.name}</h2>
          <span class="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/80">
            {project.progressPercent}% ({project.completedTasks}/{project.totalTasks} tâches)
          </span>
        </div>
        <p class="text-[11px] text-slate-400 font-mono truncate max-w-md">{project.path}</p>
      </div>
    </div>

    <!-- Center: Tabs (Roadmap vs README) -->
    <div class="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
      <button
        onclick={() => onTabChange('roadmap')}
        class="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer {activeTab === 'roadmap'
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-slate-400 hover:text-slate-200'}"
      >
        <ListTodo class="w-3.5 h-3.5" />
        <span>Roadmap</span>
      </button>

      <button
        onclick={() => onTabChange('readme')}
        class="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer {activeTab === 'readme'
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-slate-400 hover:text-slate-200'}"
      >
        <FileText class="w-3.5 h-3.5" />
        <span>README.md</span>
      </button>
    </div>

    <!-- Right: Actions (Refresh, Generate via AI) -->
    <div class="flex items-center gap-2">
      <button
        onclick={onRefresh}
        disabled={isRefreshing}
        class="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        title="Rafraîchir depuis le disque"
        aria-label="Rafraîchir depuis le disque"
      >
        <RefreshCw class="w-4 h-4 {isRefreshing ? 'animate-spin text-blue-400' : ''}" />
      </button>

      <button
        onclick={onGenerateAI}
        disabled={isGenerating}
        class="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white font-medium text-xs rounded-lg shadow-md shadow-indigo-950/40 transition-all cursor-pointer disabled:opacity-50"
      >
        <Sparkles class="w-3.5 h-3.5 {isGenerating ? 'animate-pulse' : ''}" />
        <span>{isGenerating ? 'Analyse IA...' : 'Générer via IA'}</span>
      </button>
    </div>
  {:else}
    <!-- No project active -->
    <div class="text-xs text-slate-400 flex items-center gap-2">
      <span class="w-2 h-2 rounded-full bg-slate-600"></span>
      <span>Aucun projet sélectionné</span>
    </div>
    <div></div>
    <div></div>
  {/if}
</header>
