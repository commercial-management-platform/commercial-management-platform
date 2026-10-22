// Estado de interfaz compartido entre secciones (modales globales).

class UiStore {
  registerVisit = $state({ open: false, clientId: '' })

  /** Abre "Registrar visita", opcionalmente con el cliente ya elegido. */
  openRegisterVisit(clientId = '') {
    this.registerVisit = { open: true, clientId }
  }

  closeRegisterVisit() {
    this.registerVisit.open = false
  }
}

export const ui = new UiStore()
