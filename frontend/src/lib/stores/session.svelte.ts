import { getSession, logout, type Session } from '../services/auth'

class SessionStore {
  current = $state<Session | null>(getSession())

  signIn(session: Session) {
    this.current = session
  }

  signOut() {
    logout()
    this.current = null
  }
}

export const session = new SessionStore()
