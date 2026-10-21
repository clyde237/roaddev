<script lang="ts">
  import { FolderPlus, Folder, Settings, X, ChevronRight } from '@lucide/svelte';
  import type { ProjectSummary } from '$lib/types/project';

  interface Props {
    projects: ProjectSummary[];
    activeProjectId: string | null;
    onOpenProject: () => void;
    onSelectProject: (project: ProjectSummary) => void;
    onRemoveProject: (id: string) => void;
    onOpenSettings: () => void;
  }

  let {
    projects = [],
    activeProjectId = null,
    onOpenProject,
    onSelectProject,
    onRemoveProject,
    onOpenSettings,
  }: Props = $props();
</script>

<aside class="w-64 h-full bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0 select-none backdrop-blur-sm">
  <!-- Brand Header -->
  <div class="p-4 border-b border-slate-800 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <img src="/logo_R.png" alt="RoadDev Logo" class="w-8 h-8 rounded-lg shadow-sm" />
      <div>
        <h1 class="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
          RoadDev
        </h1>
        <p class="text-[10px] text-slate-400 font-medium">Roadmap IA & Markdown</p>
      </div>
    </div>
    <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
      MVP
    </span>
  </div>

  <!-- Primary Action: Open Project -->
  <div class="p-3">
    <button
      onclick={onOpenProject}
      class="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium text-xs rounded-lg transition-all shadow-md shadow-blue-900/20 cursor-pointer"
    >
      <FolderPlus class="w-4 h-4" />
      <span>Ouvrir un projet</span>
    </button>
  </div>

  <!-- Recent Projects List -->
  <div class="flex-1 overflow-y-auto px-2 py-1 space-y-1">
    <div class="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
      Projets récents
    </div>

    {#if projects.length === 0}
      <div class="px-3 py-6 text-center text-xs text-slate-400">
        <Folder class="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
        <p>Aucun projet récent</p>
        <p class="text-[10px] text-slate-400 mt-1">Ouvrez un dossier local pour démarrer</p>
      </div>
    {:else}
      {#each projects as project (project.id)}
        {@const isActive = project.id === activeProjectId}
        <div
          class="group relative flex items-center gap-2.5 p-2 rounded-lg text-xs cursor-pointer transition-colors {isActive
            ? 'bg-blue-600/15 text-white border border-blue-500/30'
            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent'}"
          onclick={() => onSelectProject(project)}
          role="button"
          tabindex="0"
          onkeydown={(e) => e.key === 'Enter' && onSelectProject(project)}
        >
          <div class="p-1 rounded bg-slate-800/80 text-blue-400 shrink-0">
            <Folder class="w-3.5 h-3.5" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <span class="font-medium truncate">{project.name}</span>
              <span class="text-[10px] text-slate-400 ml-1 shrink-0 font-mono">
                {project.progressPercent}%
              </span>
            </div>

            <!-- Mini Progress Bar -->
            <div class="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
              <div
                class="bg-blue-500 h-full rounded-full transition-all duration-300"
                style="width: {project.progressPercent}%"
              ></div>
            </div>
          </div>

          <!-- Remove Action Button -->
          <button
            onclick={(e) => {
              e.stopPropagation();
              onRemoveProject(project.id);
            }}
            class="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700/80 text-slate-400 hover:text-red-400 rounded transition-all shrink-0 cursor-pointer"
            title="Retirer de la liste"
            aria-label="Retirer de la liste"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Footer / API Settings Button -->
  <div class="p-3 border-t border-slate-800 bg-slate-900/50">
    <button
      onclick={onOpenSettings}
      class="w-full flex items-center justify-between py-2 px-3 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
    >
      <div class="flex items-center gap-2">
        <Settings class="w-4 h-4 text-slate-400" />
        <span>Paramètres API</span>
      </div>
      <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
    </button>
  </div>
</aside>
