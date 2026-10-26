import { ApiError, configureHttp } from '../services/http'
import {
  clearSession,
  fetchCurrentUser,
  getStoredSession,
  logout,
  updateStoredUser,
  type Session,
  type UserRole,
} from '../services/auth'
import { toasts } from './toasts.svelte'

class SessionStore {
  current = $state<Session | null>(getStoredSession())
  /** "checking" mientras se valida con el backend una sesión guardada al abrir la app. */
  status = $state<'checking' | 'ready'>(getStoredSession() ? 'checking' : 'ready')

  role = $derived<UserRole | null>(this.current?.user.role ?? null)

  /** Valida la sesión guardada contra GET /auth/me. */
  async verify() {
    if (!this.current) {
      this.status = 'ready'
      return
    }
    try {
      const user = await fetchCurrentUser()
      if (this.current) {
        this.current.user = user
        updateStoredUser(user)
      }
    } catch (error) {
      // 401 ya cierra la sesión vía onUnauthorized. Sin conexión se conserva la sesión local.
      if (!(error instanceof ApiError) || (error.status !== 0 && error.status !== 401)) {
        toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'No pudimos validar tu sesión', message: 'Intenta recargar la página.' })
      }
    } finally {
      this.status = 'ready'
    }
  }

  signIn(session: Session) {
    this.current = session
    this.status = 'ready'
  }

  async signOut() {
    if (!this.current) return
    // Primero se avisa al backend (necesita el token aún vigente) y luego se limpia la sesión local.
    await logout()
    this.current = null
  }

  /** El backend rechazó el token: la sesión venció o fue revocada. */
  expire() {
    if (!this.current) return
    this.current = null
    clearSession()
    toasts.push({
      tone: 'warning',
      icon: 'lock',
      title: 'Tu sesión expiró',
      message: 'Vuelve a iniciar sesión para continuar.',
    })
  }

  hasRole(...roles: UserRole[]) {
    return !!this.role && roles.includes(this.role)
  }
}

export const session = new SessionStore()

configureHttp({
  getToken: () => session.current?.token ?? null,
  onUnauthorized: () => session.expire(),
})
