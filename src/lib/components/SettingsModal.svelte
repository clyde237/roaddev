<script lang="ts">
  import { untrack } from 'svelte';
  import {
    X,
    Key,
    Check,
    AlertCircle,
    Eye,
    EyeOff,
    Sparkles,
    Loader2,
    Globe,
    Cpu,
    ClipboardPaste,
  } from '@lucide/svelte';
  import type { AISettings } from '$lib/services/aiSettings';
  import { testAIConnection } from '$lib/services/aiGenerator';
  import {
    RECOMMENDED_NEMOTRON_CHAT,
    RECOMMENDED_NEMOTRON_EMBED,
  } from '$lib/services/openrouterService';

  interface Props {
    settings: AISettings;
    isOpen: boolean;
    onClose: () => void;
    onSave: (newSettings: AISettings) => Promise<void>;
  }

  let { settings, isOpen, onClose, onSave }: Props = $props();

  let localSettings = $state<AISettings>({
    provider: 'openrouter',
    openrouterKey: '',
    openrouterModel: RECOMMENDED_NEMOTRON_CHAT,
    geminiKey: '',
    geminiModel: 'gemini-2.0-flash',
    mistralKey: '',
    mistralModel: 'mistral-large-latest',
  });

  let showOpenRouterKey = $state<boolean>(false);
  let showGeminiKey = $state<boolean>(false);
  let showMistralKey = $state<boolean>(false);
  let isTesting = $state<boolean>(false);
  let testResult = $state<{ success: boolean; message: string } | null>(null);
  let isSaving = $state<boolean>(false);

  let wasOpen = false;

  $effect(() => {
    const currentOpen = isOpen;
    if (currentOpen && !wasOpen) {
      untrack(() => {
        localSettings = { ...settings };
        if (!localSettings.openrouterModel || localSettings.openrouterModel === 'auto-free') {
          localSettings.openrouterModel = RECOMMENDED_NEMOTRON_CHAT;
        }
        testResult = null;
      });
    }
    wasOpen = currentOpen;
  });

  async function pasteToKey(provider: 'openrouter' | 'gemini' | 'mistral') {
    let text = '';
    try {
      const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
      text = await readText();
    } catch {
      // Fallback navigateur
    }

    if (!text && typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      try {
        text = await navigator.clipboard.readText();
      } catch (err) {
        console.warn('Impossible de lire le presse-papier:', err);
      }
    }

    if (text && text.trim().length > 0) {
      const clean = text.trim();
      if (provider === 'openrouter') localSettings.openrouterKey = clean;
      else if (provider === 'gemini') localSettings.geminiKey = clean;
      else if (provider === 'mistral') localSettings.mistralKey = clean;
    }
  }

  async function handleTest() {
    isTesting = true;
    testResult = null;
    try {
      const res = await testAIConnection(localSettings);
      testResult = res;
    } finally {
      isTesting = false;
    }
  }

  async function handleSave() {
    if (!isKeyProvided()) {
      testResult = {
        success: false,
        message: 'Veuillez saisir votre clé API pour ce fournisseur avant d’enregistrer.',
      };
      return;
    }
    isSaving = true;
    try {
      await onSave(localSettings);
      onClose();
    } finally {
      isSaving = false;
    }
  }

  function isKeyProvided(): boolean {
    if (localSettings.provider === 'openrouter') {
      return Boolean(localSettings.openrouterKey && localSettings.openrouterKey.trim().length > 0);
    }
    if (localSettings.provider === 'gemini') {
      return Boolean(localSettings.geminiKey && localSettings.geminiKey.trim().length > 0);
    }
    return Boolean(localSettings.mistralKey && localSettings.mistralKey.trim().length > 0);
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col select-text"
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Key class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">Paramètres des API IA</h3>
            <p class="text-[11px] text-slate-400">Vos clés sont isolées localement sur votre machine</p>
          </div>
        </div>
        <button
          onclick={onClose}
          class="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
        <!-- Provider Selector -->
        <div>
          <span class="block text-xs font-semibold text-slate-300 mb-2">Fournisseur d'IA actif</span>
          <div class="grid grid-cols-3 gap-2.5">
            <!-- OpenRouter -->
            <button
              type="button"
              onclick={() => (localSettings.provider = 'openrouter')}
              class="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-center transition-all cursor-pointer {localSettings.provider === 'openrouter'
                ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm shadow-blue-500/10'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'}"
            >
              <div class="flex items-center gap-1.5">
                <Globe class="w-4 h-4 text-blue-400" />
                <span class="text-xs font-semibold">OpenRouter</span>
              </div>
              <span class="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                NVIDIA Nemotron
              </span>
            </button>

            <!-- Google AI Studio -->
            <button
              type="button"
              onclick={() => (localSettings.provider = 'gemini')}
              class="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-center transition-all cursor-pointer {localSettings.provider === 'gemini'
                ? 'bg-purple-600/15 border-purple-500 text-white shadow-sm shadow-purple-500/10'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'}"
            >
              <div class="flex items-center gap-1.5">
                <Sparkles class="w-4 h-4 text-purple-400" />
                <span class="text-xs font-semibold">Google Studio</span>
              </div>
              <span class="text-[10px] text-slate-400">Gemini direct</span>
            </button>

            <!-- Mistral AI -->
            <button
              type="button"
              onclick={() => (localSettings.provider = 'mistral')}
              class="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-center transition-all cursor-pointer {localSettings.provider === 'mistral'
                ? 'bg-orange-600/15 border-orange-500 text-white shadow-sm shadow-orange-500/10'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'}"
            >
              <div class="flex items-center gap-1.5">
                <span class="w-4 h-4 font-bold text-orange-400 flex items-center justify-center">M</span>
                <span class="text-xs font-semibold">Mistral AI</span>
              </div>
              <span class="text-[10px] text-slate-400">Mistral Large</span>
            </button>
          </div>
        </div>

        <!-- OpenRouter Configuration -->
        {#if localSettings.provider === 'openrouter'}
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-4">
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label for="openrouter-key" class="text-xs font-semibold text-slate-300">
                  Clé API OpenRouter
                </label>
                {#if isKeyProvided()}
                  <span class="text-[11px] text-emerald-400 font-medium">
                    ✓ Clé configurée
                  </span>
                {:else}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    class="text-[11px] text-blue-400 hover:underline"
                  >
                    Obtenir une clé sur OpenRouter
                  </a>
                {/if}
              </div>
              <div class="relative flex items-center">
                <input
                  id="openrouter-key"
                  type={showOpenRouterKey ? 'text' : 'password'}
                  bind:value={localSettings.openrouterKey}
                  placeholder="Collez votre clé API (sk-or-v1-...)"
                  onpaste={(e) => {
                    const text = e.clipboardData?.getData('text');
                    if (text) {
                      e.preventDefault();
                      localSettings.openrouterKey = text.trim();
                    }
                  }}
                  class="w-full bg-slate-900 text-xs text-white px-3 py-2 pr-24 rounded-lg border border-slate-800 focus:border-blue-500 focus:outline-none font-mono select-text"
                />
                <div class="absolute right-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onclick={() => pasteToKey('openrouter')}
                    class="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white rounded border border-slate-700 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    title="Coller depuis le presse-papier"
                  >
                    <ClipboardPaste class="w-3 h-3 text-blue-400" />
                    <span>Coller</span>
                  </button>
                  <button
                    type="button"
                    onclick={() => (showOpenRouterKey = !showOpenRouterKey)}
                    class="p-1 text-slate-500 hover:text-slate-300 cursor-pointer"
                    title={showOpenRouterKey ? 'Masquer' : 'Afficher'}
                  >
                    {#if showOpenRouterKey}
                      <EyeOff class="w-3.5 h-3.5" />
                    {:else}
                      <Eye class="w-3.5 h-3.5" />
                    {/if}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label for="openrouter-model" class="block text-xs font-semibold text-slate-300 mb-1.5">
                Modèle OpenRouter
              </label>

              <div class="relative mb-2">
                <input
                  id="openrouter-model"
                  type="text"
                  bind:value={localSettings.openrouterModel}
                  placeholder="ex: nvidia/nemotron-3.5-lightning:free"
                  class="w-full bg-slate-900 text-xs text-white px-3 py-2 rounded-lg border border-slate-800 focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>

              <!-- Raccourcis modèles NVIDIA Nemotron -->
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  onclick={() => (localSettings.openrouterModel = RECOMMENDED_NEMOTRON_CHAT)}
                  class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] transition-all cursor-pointer {localSettings.openrouterModel === RECOMMENDED_NEMOTRON_CHAT
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-medium'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}"
                >
                  <Cpu class="w-3 h-3 text-emerald-400" />
                  <span>Nemotron 3.5 Lightning (Roadmaps)</span>
                </button>

                <button
                  type="button"
                  onclick={() => (localSettings.openrouterModel = RECOMMENDED_NEMOTRON_EMBED)}
                  class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] transition-all cursor-pointer {localSettings.openrouterModel === RECOMMENDED_NEMOTRON_EMBED
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-medium'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}"
                >
                  <Cpu class="w-3 h-3 text-purple-400" />
                  <span>Nemotron 3.5 Embed 1B</span>
                </button>
              </div>
            </div>
          </div>
        {:else if localSettings.provider === 'gemini'}
          <!-- Google AI Studio Configuration -->
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-4">
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label for="gemini-key" class="text-xs font-semibold text-slate-300">
                  Clé API Google AI Studio (Gemini)
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  class="text-[11px] text-blue-400 hover:underline"
                >
                  Console Google AI Studio
                </a>
              </div>
              <div class="relative flex items-center">
                <input
                  id="gemini-key"
                  type={showGeminiKey ? 'text' : 'password'}
                  bind:value={localSettings.geminiKey}
                  placeholder="Collez votre clé API Gemini ici..."
                  onpaste={(e) => {
                    const text = e.clipboardData?.getData('text');
                    if (text) {
                      e.preventDefault();
                      localSettings.geminiKey = text.trim();
                    }
                  }}
                  class="w-full bg-slate-900 text-xs text-white px-3 py-2 pr-24 rounded-lg border border-slate-800 focus:border-blue-500 focus:outline-none font-mono select-text"
                />
                <div class="absolute right-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onclick={() => pasteToKey('gemini')}
                    class="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white rounded border border-slate-700 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    title="Coller depuis le presse-papier"
                  >
                    <ClipboardPaste class="w-3 h-3 text-blue-400" />
                    <span>Coller</span>
                  </button>
                  <button
                    type="button"
                    onclick={() => (showGeminiKey = !showGeminiKey)}
                    class="p-1 text-slate-500 hover:text-slate-300 cursor-pointer"
                    title={showGeminiKey ? 'Masquer' : 'Afficher'}
                  >
                    {#if showGeminiKey}
                      <EyeOff class="w-3.5 h-3.5" />
                    {:else}
                      <Eye class="w-3.5 h-3.5" />
                    {/if}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label for="gemini-model" class="block text-xs font-semibold text-slate-300 mb-1.5">Modèle Gemini</label>
              <select
                id="gemini-model"
                bind:value={localSettings.geminiModel}
                class="w-full bg-slate-900 text-xs text-white px-3 py-2 rounded-lg border border-slate-800 focus:border-blue-500 focus:outline-none"
              >
                <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro</option>
              </select>
            </div>
          </div>
        {:else}
          <!-- Mistral Configuration -->
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-4">
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label for="mistral-key" class="text-xs font-semibold text-slate-300">
                  Clé API Mistral AI
                </label>
                <a
                  href="https://console.mistral.ai/api-keys/"
                  target="_blank"
                  class="text-[11px] text-orange-400 hover:underline"
                >
                  Console Mistral
                </a>
              </div>
              <div class="relative flex items-center">
                <input
                  id="mistral-key"
                  type={showMistralKey ? 'text' : 'password'}
                  bind:value={localSettings.mistralKey}
                  placeholder="Collez votre clé API Mistral..."
                  onpaste={(e) => {
                    const text = e.clipboardData?.getData('text');
                    if (text) {
                      e.preventDefault();
                      localSettings.mistralKey = text.trim();
                    }
                  }}
                  class="w-full bg-slate-900 text-xs text-white px-3 py-2 pr-24 rounded-lg border border-slate-800 focus:border-orange-500 focus:outline-none font-mono select-text"
                />
                <div class="absolute right-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onclick={() => pasteToKey('mistral')}
                    class="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white rounded border border-slate-700 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    title="Coller depuis le presse-papier"
                  >
                    <ClipboardPaste class="w-3 h-3 text-orange-400" />
                    <span>Coller</span>
                  </button>
                  <button
                    type="button"
                    onclick={() => (showMistralKey = !showMistralKey)}
                    class="p-1 text-slate-500 hover:text-slate-300 cursor-pointer"
                    title={showMistralKey ? 'Masquer' : 'Afficher'}
                  >
                    {#if showMistralKey}
                      <EyeOff class="w-3.5 h-3.5" />
                    {:else}
                      <Eye class="w-3.5 h-3.5" />
                    {/if}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label for="mistral-model" class="block text-xs font-semibold text-slate-300 mb-1.5">Modèle Mistral</label>
              <select
                id="mistral-model"
                bind:value={localSettings.mistralModel}
                class="w-full bg-slate-900 text-xs text-white px-3 py-2 rounded-lg border border-slate-800 focus:border-orange-500 focus:outline-none"
              >
                <option value="mistral-large-latest">mistral-large-latest (Recommandé)</option>
                <option value="mistral-small-latest">mistral-small-latest</option>
              </select>
            </div>
          </div>
        {/if}

        <!-- Test Connection Feedback -->
        {#if testResult}
          <div
            class="p-3 rounded-xl flex items-start gap-2.5 text-xs {testResult.success
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'}"
          >
            {#if testResult.success}
              <Check class="w-4 h-4 shrink-0 mt-0.5" />
            {:else}
              <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
            {/if}
            <p>{testResult.message}</p>
          </div>
        {/if}
      </div>

      <!-- Footer Actions -->
      <div class="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <button
          type="button"
          onclick={handleTest}
          disabled={isTesting || !isKeyProvided()}
          class="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-40 text-slate-200 text-xs font-medium rounded-xl transition-all cursor-pointer"
        >
          {#if isTesting}
            <Loader2 class="w-3.5 h-3.5 animate-spin" />
            <span>Test en cours...</span>
          {:else}
            <Sparkles class="w-3.5 h-3.5" />
            <span>Tester la connexion</span>
          {/if}
        </button>

        <div class="flex items-center gap-2">
          <button
            type="button"
            onclick={onClose}
            class="px-3.5 py-2 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-xl transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onclick={handleSave}
            disabled={isSaving || !isKeyProvided()}
            class="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-xl shadow-md transition-all cursor-pointer"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
