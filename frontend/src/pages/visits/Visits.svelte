<script lang="ts">
  import { can } from '../../lib/permissions.svelte'
  import AdvisorAgenda from './AdvisorAgenda.svelte'
  import VisitsBoard from './VisitsBoard.svelte'

  // Visitas (HU-08 y HU-09): el asesor ve su agenda y registra; el gestor programa y consulta.
</script>

{#if can.isAdvisor}
  <AdvisorAgenda />
{:else}
  <VisitsBoard />
{/if}
