<script lang="ts">
  import '@xyflow/svelte/dist/style.css';
  import '../app.css';
  let { children } = $props();
</script>
{@render children()}
