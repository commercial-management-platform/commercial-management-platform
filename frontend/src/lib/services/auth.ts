import { ApiError, http } from './http'

// Autenticación contra el backend (Better Auth detrás de /api/auth):
//   POST /auth/login   { email, password } -> { token, user }
//   GET  /auth/me      -> perfil del usuario de la sesión
//   POST /auth/logout  -> invalida la sesión
// El token se envía como "Authorization: Bearer" (plugin bearer de Better Auth).

export type UserRole = 'admin' | 'director' | 'advisor'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface Session {
  token: string
  user: User
}

export const roleLabel: Record<UserRole, string> = {
  admin: 'Administrador',
  director: 'Director comercial',
  advisor: 'Asesor comercial',
}

/** Error de autenticación con un mensaje listo para mostrar al usuario. */
export class AuthError extends Error {}

interface UserProfileDto {
  id: string
  name: string
  email: string
  role: UserRole
}

interface AuthResponseDto {
  token: string
  user: UserProfileDto
}

const SESSION_KEY = 'kestrel.session'

const toUser = ({ id, name, email, role }: UserProfileDto): User => ({ id, name, email, role })

export async function login(email: string, password: string, remember: boolean): Promise<Session> {
  try {
    const res = await http<AuthResponseDto>('/auth/login', {
      method: 'POST',
      body: { email: email.trim().toLowerCase(), password },
      auth: false,
    })
    const session: Session = { token: res.token, user: toUser(res.user) }
    saveSession(session, remember)
    return session
  } catch (error) {
    throw new AuthError(loginErrorMessage(error))
  }
}

/** Confirma con el backend que la sesión guardada sigue vigente y trae el perfil actualizado. */
export async function fetchCurrentUser(): Promise<User> {
  return toUser(await http<UserProfileDto>('/auth/me'))
}

/** Cierra la sesión en el backend (mejor esfuerzo) y la borra del navegador. */
export async function logout(): Promise<void> {
  try {
    await http('/auth/logout', { method: 'POST' })
  } catch {
    // Si el token ya no es válido igual se limpia la sesión local.
  } finally {
    clearSession()
  }
}

// --- Persistencia local ------------------------------------------------------
// "Recordarme" guarda la sesión en localStorage; si no, dura lo que la pestaña.

function saveSession(session: Session, remember: boolean) {
  try {
    clearSession()
    ;(remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    /* almacenamiento no disponible: la sesión vive solo en memoria */
  }
}

export function getStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY)
    const session = raw ? (JSON.parse(raw) as Partial<Session>) : null
    // Descarta sesiones del modo simulado anterior (sin token).
    return session?.token && session.user ? (session as Session) : null
  } catch {
    return null
  }
}

export function updateStoredUser(user: User) {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const raw = storage.getItem(SESSION_KEY)
      if (raw) storage.setItem(SESSION_KEY, JSON.stringify({ ...JSON.parse(raw), user }))
    } catch {
      /* ignorar */
    }
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignorar */
  }
}

function loginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'No pudimos iniciar sesión. Intenta de nuevo.'
  if (error.status === 0) return error.message
  if (error.status === 401) {
    return /suspend/i.test(error.message)
      ? 'Tu cuenta está suspendida. Contacta a un administrador.'
      : 'Correo o contraseña incorrectos.'
  }
  if (error.status === 400) return 'Revisa el correo y la contraseña (mínimo 8 caracteres).'
  if (error.status === 429) return 'Demasiados intentos. Espera un momento antes de volver a intentar.'
  return 'El servidor tuvo un problema. Intenta de nuevo en unos minutos.'
}
