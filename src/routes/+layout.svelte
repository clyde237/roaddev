<script lang="ts">
  import '../app.css';

  let { children } = $props();
</script>

<div class="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
  {@render children()}
</div>
