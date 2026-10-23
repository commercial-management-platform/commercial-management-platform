<script lang="ts">
  import Modal from '../../lib/components/Modal.svelte'
  import { updateFollowUp, type ApiFollowUp } from '../../lib/services/followUpsApi'
  import { businessToday } from '../../lib/services/visitsApi'
  import { errorText } from '../../lib/stores/clientDirectory.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'

  // Editar un seguimiento pendiente (HU-10, CA-06): fecha, actividad y observación.

  interface Props {
    followUp: ApiFollowUp | null
    onclose: () => void
    onsaved: (followUp: ApiFollowUp) => void
  }

  let { followUp, onclose, onsaved }: Props = $props()

  let nextDate = $state('')
  let activity = $state('')
  let observation = $state('')
  let error = $state('')
  let saving = $state(false)

  $effect(() => {
    if (!followUp) return
    nextDate = followUp.nextDate
    activity = followUp.activity
    observation = followUp.observation ?? ''
    error = ''
  })

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    if (!followUp) return
    error = ''
    if (!activity.trim()) return void (error = 'Describe la actividad.')
    // Una fecha vencida se puede conservar; solo no se puede mover al pasado.
    const dateChanged = nextDate !== followUp.nextDate
    if (dateChanged && nextDate < businessToday()) return void (error = 'La fecha no puede ser pasada.')
    saving = true
    try {
      const saved = await updateFollowUp(followUp.id, {
        nextDate: dateChanged ? nextDate : undefined,
        activity: activity.trim(),
        observation: observation.trim(),
      })
      toasts.push({ tone: 'success', icon: 'check', title: 'Seguimiento actualizado', message: saved.activity })
      onsaved(saved)
      onclose()
    } catch (e) {
      error = errorText(e, 'No pudimos guardar los cambios.')
    } finally {
      saving = false
    }
  }
</script>

<Modal open={!!followUp} {onclose} title="Editar seguimiento" subtitle={followUp?.activity ?? ''}>
  <form id="edit-follow-up" class="form" onsubmit={submit} novalidate>
    <label class="field">
      Fecha
      <input class="input" type="date" bind:value={nextDate} min={businessToday()} required />
    </label>
    <label class="field full">
      Actividad
      <input class="input" bind:value={activity} maxlength="255" required />
    </label>
    <label class="field full">
      Observación
      <textarea class="input" rows="3" maxlength="2000" bind:value={observation}></textarea>
    </label>
    {#if error}<p class="error full" role="alert">{error}</p>{/if}
  </form>

  {#snippet footer()}
    <button class="btn btn-outline" type="button" onclick={onclose}>Cancelar</button>
    <button class="btn btn-primary" type="submit" form="edit-follow-up" disabled={saving}>
      {saving ? 'Guardando…' : 'Guardar cambios'}
    </button>
  {/snippet}
</Modal>

<style>
  .form {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .field :global(.input) {
    width: 100%;
    font-weight: 400;
  }

  textarea.input {
    height: auto;
    padding: 10px 12px;
    resize: vertical;
  }

  .error {
    font-size: 13px;
    color: var(--danger);
  }
</style>
