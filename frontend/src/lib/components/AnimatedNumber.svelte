<script lang="ts">
  import { Tween } from 'svelte/motion'
  import { cubicOut } from 'svelte/easing'

  interface Props {
    value: number
    format?: (value: number) => string
  }

  let { value, format = (v) => String(Math.round(v)) }: Props = $props()

  // Interpola suavemente cada vez que llega un valor nuevo.
  const tween = Tween.of(() => value, { duration: 700, easing: cubicOut })
</script>

{format(tween.current)}
