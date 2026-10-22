import type { IconName } from '../components/Icon.svelte'

export interface Toast {
  id: number
  title: string
  message: string
  icon: IconName
  tone: 'success' | 'info' | 'warning'
}

const MAX_VISIBLE = 3
const DURATION = 4500

class ToastStore {
  items = $state<Toast[]>([])
  #seq = 0

  push(toast: Omit<Toast, 'id'>) {
    const id = ++this.#seq
    this.items = [{ ...toast, id }, ...this.items].slice(0, MAX_VISIBLE)
    setTimeout(() => this.dismiss(id), DURATION)
  }

  dismiss(id: number) {
    this.items = this.items.filter((t) => t.id !== id)
  }
}

export const toasts = new ToastStore()
