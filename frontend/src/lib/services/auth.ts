// Servicio de autenticación SIMULADO.
// Cuando el backend esté listo, reemplazar el cuerpo de estas funciones por
// las llamadas al cliente de betterAuth manteniendo las mismas firmas.

export interface User {
  name: string
  email: string
}

export interface Session {
  user: User
}

export class AuthError extends Error {}

const SESSION_KEY = 'kestrel.session'

// Credenciales de prueba mientras no exista backend.
export const DEMO_CREDENTIALS = {
  email: 'demo@kestrel.com',
  password: 'kestrel123',
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function login(email: string, password: string, remember: boolean): Promise<Session> {
  await wait(900)

  const valid =
    email.trim().toLowerCase() === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password
  if (!valid) {
    throw new AuthError('Correo o contraseña incorrectos.')
  }

  const session: Session = { user: { name: 'Andrea Méndez', email: DEMO_CREDENTIALS.email } }
  const storage = remember ? localStorage : sessionStorage
  storage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function getSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
}
