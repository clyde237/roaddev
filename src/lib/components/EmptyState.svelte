<script lang="ts">
  import { FolderPlus, GitBranch, Cpu, Zap } from '@lucide/svelte';

  interface Props {
    onOpenProject: () => void;
  }

  let { onOpenProject }: Props = $props();
</script>

<div class="h-full flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto select-none">
  <!-- Brand Logo -->
  <div class="relative mb-6">
    <div class="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-full blur-xl"></div>
    <img
      src="/logo_R.png"
      alt="RoadDev Logo"
      class="relative w-24 h-24 rounded-2xl shadow-xl shadow-blue-500/10 border border-slate-800"
    />
  </div>

  <h2 class="text-2xl font-bold text-white tracking-tight">Bienvenue sur RoadDev</h2>
  <p class="text-slate-400 text-sm mt-2 max-w-md">
    Transformez automatiquement les fichiers <code class="text-blue-400 font-mono text-xs bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">README.md</code> de vos dépôts locaux en roadmaps interactives synchronisées en Markdown.
  </p>

  <!-- Main CTA Button -->
  <button
    onclick={onOpenProject}
    class="mt-8 flex items-center gap-2.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
  >
    <FolderPlus class="w-4 h-4" />
    <span>Sélectionner un dossier local</span>
  </button>

  <!-- Feature Grid -->
  <div class="grid grid-cols-3 gap-4 mt-12 w-full text-left">
    <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
      <div class="p-2 rounded-lg bg-blue-500/10 text-blue-400 w-fit mb-3">
        <Zap class="w-4 h-4" />
      </div>
      <h3 class="text-xs font-semibold text-white">&lt; 30 sec Zéro Friction</h3>
      <p class="text-[11px] text-slate-400 mt-1">De la sélection d'un dossier à une roadmap générée prête à cocher.</p>
    </div>

    <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
      <div class="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 w-fit mb-3">
        <GitBranch class="w-4 h-4" />
      </div>
      <h3 class="text-xs font-semibold text-white">100% Git-Native</h3>
      <p class="text-[11px] text-slate-400 mt-1">Aucune base propriétaire. Le fichier <span class="font-mono text-slate-300">ROADMAP.md</span> vit dans votre dépôt.</p>
    </div>

    <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
      <div class="p-2 rounded-lg bg-purple-500/10 text-purple-400 w-fit mb-3">
        <Cpu class="w-4 h-4" />
      </div>
      <h3 class="text-xs font-semibold text-white">&lt; 50 Mo RAM</h3>
      <p class="text-[11px] text-slate-400 mt-1">Propulsé par Rust et WebKitGTK natif via Tauri v2, sans lourdeur Chromium.</p>
    </div>
  </div>
</div>
