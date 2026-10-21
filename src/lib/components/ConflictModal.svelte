<script lang="ts">
  import { AlertTriangle, GitMerge, RefreshCw, X } from '@lucide/svelte';

  interface Props {
    isOpen: boolean;
    projectName: string;
    existingTasksCount: number;
    onOverwrite: () => void;
    onMerge: () => void;
    onCancel: () => void;
  }

  let { isOpen, projectName, existingTasksCount, onOverwrite, onMerge, onCancel }: Props = $props();
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">Roadmap existante</h3>
            <p class="text-[11px] text-slate-400">Ce projet contient déjà {existingTasksCount} tâche(s)</p>
          </div>
        </div>
        <button
          onclick={onCancel}
          class="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Body / Choices -->
      <div class="p-6 space-y-4">
        <p class="text-xs text-slate-300 leading-relaxed">
          Un fichier <code class="text-blue-400 font-mono text-[11px] bg-slate-950 px-1 py-0.5 rounded">ROADMAP.md</code> existe déjà pour <strong>{projectName}</strong>. Comment souhaitez-vous appliquer la génération par l'IA ?
        </p>

        <!-- Option 1: Merge -->
        <button
          type="button"
          onclick={onMerge}
          class="w-full text-left p-4 rounded-xl border border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10 transition-all cursor-pointer group"
        >
          <div class="flex items-center gap-2 mb-1">
            <GitMerge class="w-4 h-4 text-blue-400" />
            <h4 class="text-xs font-bold text-white group-hover:text-blue-300">
              Compléter & Fusionner (Recommandé)
            </h4>
          </div>
          <p class="text-[11px] text-slate-400 leading-normal">
            Conserve toutes vos tâches existantes et vos cases déjà cochées, et ajoute les nouvelles phases proposées par l'IA.
          </p>
        </button>

        <!-- Option 2: Overwrite -->
        <button
          type="button"
          onclick={onOverwrite}
          class="w-full text-left p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/40 hover:border-red-500/30 transition-all cursor-pointer group"
        >
          <div class="flex items-center gap-2 mb-1">
            <RefreshCw class="w-4 h-4 text-amber-400 group-hover:text-red-400" />
            <h4 class="text-xs font-bold text-white group-hover:text-red-300">
              Écraser la roadmap
            </h4>
          </div>
          <p class="text-[11px] text-slate-400 leading-normal">
            Remplace l'intégralité du fichier par le nouveau découpage de l'IA. Les tâches actuelles seront perdues.
          </p>
        </button>
      </div>

      <!-- Footer -->
      <div class="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex justify-end">
        <button
          type="button"
          onclick={onCancel}
          class="px-4 py-2 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-xl transition-colors cursor-pointer"
        >
          Annuler
        </button>
      </div>
    </div>
  </div>
{/if}
