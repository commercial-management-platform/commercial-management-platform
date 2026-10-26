/**
 * Estado global de la barra superior: la pausa de las actualizaciones "En vivo"
 * (las pantallas consultan el backend cada 30 s mientras esté activa) y la
 * búsqueda de clientes que filtra el dashboard.
 */
class DashboardStore {
  live = $state(true)
  query = $state('')

  toggleLive() {
    this.live = !this.live
  }
}

export const dashboard = new DashboardStore()
