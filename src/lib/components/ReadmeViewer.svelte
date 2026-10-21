<script lang="ts">
  import { Eye, Edit3, Save, RotateCcw, FileText, PlusCircle, Check } from '@lucide/svelte';
  import { marked } from 'marked';

  interface Props {
    content: string;
    filename: string | null;
    hasReadme: boolean;
    onSave: (newContent: string) => Promise<void>;
    onCreateReadme: () => Promise<void>;
  }

  let { content = '', filename = null, hasReadme = false, onSave, onCreateReadme }: Props = $props();

  let mode = $state<'preview' | 'edit'>('preview');
  let editBuffer = $state<string>('');
  let isSaving = $state<boolean>(false);
  let saveSuccess = $state<boolean>(false);
  let isCreating = $state<boolean>(false);

  // Synchronise le buffer avec le contenu reçu
  $effect(() => {
    editBuffer = content;
  });

  let isDirty = $derived(editBuffer !== content);

  let renderedHtml = $derived.by(() => {
    try {
      return marked.parse(content || '') as string;
    } catch (err) {
      console.error('Erreur parsing markdown:', err);
      return '<p class="text-red-400">Erreur lors du rendu Markdown.</p>';
    }
  });

  async function handleSave() {
    isSaving = true;
    saveSuccess = false;
    try {
      await onSave(editBuffer);
      saveSuccess = true;
      setTimeout(() => {
        saveSuccess = false;
      }, 2000);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde du README:', err);
    } finally {
      isSaving = false;
    }
  }

  function handleCancel() {
    editBuffer = content;
    mode = 'preview';
  }

  async function handleCreate() {
    isCreating = true;
    try {
      await onCreateReadme();
      mode = 'edit';
    } finally {
      isCreating = false;
    }
  }
</script>

<div class="h-full flex flex-col bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden">
  <!-- Bar d'outils du Viewer -->
  <div class="h-12 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 shrink-0">
    <div class="flex items-center gap-2">
      <FileText class="w-4 h-4 text-blue-400" />
      <span class="text-xs font-semibold text-slate-200">
        {filename || 'README.md'}
      </span>
      {#if hasReadme && isDirty}
        <span class="text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded font-medium">
          Modifié
        </span>
      {/if}
      {#if saveSuccess}
        <span class="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded font-medium">
          <Check class="w-3 h-3" />
          Enregistré
        </span>
      {/if}
    </div>

    {#if hasReadme}
      <div class="flex items-center gap-2">
        <!-- Switcher Aperçu / Édition -->
        <div class="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            onclick={() => (mode = 'preview')}
            class="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer {mode === 'preview'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-slate-200'}"
          >
            <Eye class="w-3.5 h-3.5" />
            <span>Aperçu</span>
          </button>
          <button
            onclick={() => (mode = 'edit')}
            class="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer {mode === 'edit'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-slate-200'}"
          >
            <Edit3 class="w-3.5 h-3.5" />
            <span>Édition</span>
          </button>
        </div>

        {#if mode === 'edit'}
          <button
            onclick={handleCancel}
            disabled={!isDirty || isSaving}
            class="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            title="Annuler les modifications"
          >
            <RotateCcw class="w-3.5 h-3.5" />
            <span>Annuler</span>
          </button>

          <button
            onclick={handleSave}
            disabled={!isDirty || isSaving}
            class="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-40"
          >
            <Save class="w-3.5 h-3.5" />
            <span>{isSaving ? 'Enregistrement...' : 'Enregistrer'}</span>
          </button>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Contenu Principal -->
  <div class="flex-1 overflow-y-auto p-6">
    {#if !hasReadme}
      <!-- État d'absence de README -->
      <div class="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
        <div class="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 mb-4">
          <FileText class="w-8 h-8" />
        </div>
        <h3 class="text-base font-semibold text-white">Aucun fichier README trouvé</h3>
        <p class="text-xs text-slate-400 mt-1.5 mb-6">
          Ce projet ne possède pas encore de documentation README. Vous pouvez en générer un rapidement pour que RoadDev puisse analyser vos objectifs.
        </p>
        <button
          onclick={handleCreate}
          disabled={isCreating}
          class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-medium rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
        >
          <PlusCircle class="w-4 h-4" />
          <span>{isCreating ? 'Création en cours...' : 'Créer un README.md'}</span>
        </button>
      </div>
    {:else if mode === 'preview'}
      <!-- Rendu Markdown stylisé -->
      <article class="markdown-body max-w-4xl mx-auto space-y-4 text-slate-300 text-sm leading-relaxed">
        {@html renderedHtml}
      </article>
    {:else}
      <!-- Éditeur rapide de Markdown -->
      <div class="h-full max-w-4xl mx-auto flex flex-col">
        <textarea
          bind:value={editBuffer}
          class="w-full flex-1 p-4 bg-slate-950 text-slate-200 font-mono text-xs rounded-xl border border-slate-800 focus:border-blue-500 focus:outline-none resize-none leading-relaxed"
          placeholder="Rédigez votre documentation Markdown ici..."
          spellcheck="false"
        ></textarea>
      </div>
    {/if}
  </div>
</div>

<style>
  :global(.markdown-body h1) {
    font-size: 1.5rem;
    font-weight: 700;
    color: #ffffff;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 0.5rem;
    margin-top: 1.5rem;
    margin-bottom: 1rem;
  }
  :global(.markdown-body h2) {
    font-size: 1.25rem;
    font-weight: 600;
    color: #f1f5f9;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 0.35rem;
    margin-top: 1.25rem;
    margin-bottom: 0.75rem;
  }
  :global(.markdown-body h3) {
    font-size: 1.1rem;
    font-weight: 600;
    color: #e2e8f0;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }
  :global(.markdown-body p) {
    margin-bottom: 1rem;
  }
  :global(.markdown-body ul) {
    list-style-type: disc;
    padding-left: 1.5rem;
    margin-bottom: 1rem;
  }
  :global(.markdown-body ol) {
    list-style-type: decimal;
    padding-left: 1.5rem;
    margin-bottom: 1rem;
  }
  :global(.markdown-body li) {
    margin-bottom: 0.25rem;
  }
  :global(.markdown-body pre) {
    background-color: #020617;
    border: 1px solid #1e293b;
    border-radius: 0.5rem;
    padding: 1rem;
    overflow-x: auto;
    font-family: monospace;
    font-size: 0.8rem;
    margin-bottom: 1rem;
  }
  :global(.markdown-body code:not(pre code)) {
    background-color: #0f172a;
    border: 1px solid #1e293b;
    padding: 0.15rem 0.35rem;
    border-radius: 0.25rem;
    font-family: monospace;
    color: #60a5fa;
    font-size: 0.85em;
  }
  :global(.markdown-body blockquote) {
    border-left: 3px solid #3b82f6;
    padding-left: 1rem;
    color: #94a3b8;
    margin-bottom: 1rem;
    font-style: italic;
  }
  :global(.markdown-body a) {
    color: #60a5fa;
    text-decoration: underline;
  }
  :global(.markdown-body table) {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1rem;
  }
  :global(.markdown-body th, .markdown-body td) {
    border: 1px solid #1e293b;
    padding: 0.5rem 0.75rem;
    text-align: left;
  }
  :global(.markdown-body th) {
    background-color: #0f172a;
    color: #f1f5f9;
  }
</style>
