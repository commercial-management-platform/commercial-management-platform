// Router mínimo basado en el hash (#/rutas/asignadas?asesor=a1). Suficiente mientras la app sea una SPA sin SSR.

export const ROUTES = [
  'dashboard',
  'rutas/crear',
  'rutas/asignadas',
  'rutas/asesores',
  'clientes',
  'visitas',
  'seguimientos',
  'cotizaciones',
  'pedidos',
  'administracion',
] as const
export type Route = (typeof ROUTES)[number]

/** Rutas "padre" que redirigen a su primera subsección. */
const ALIASES: Record<string, Route> = { rutas: 'rutas/crear' }

function read(): { route: Route; params: Record<string, string> } {
  const [path, query = ''] = location.hash.replace(/^#\/?/, '').split('?')
  const params = Object.fromEntries(new URLSearchParams(query))
  if (ALIASES[path]) return { route: ALIASES[path], params }
  const route = (ROUTES as readonly string[]).includes(path) ? (path as Route) : 'dashboard'
  return { route, params }
}

class Router {
  route = $state<Route>(read().route)
  params = $state<Record<string, string>>(read().params)

  constructor() {
    window.addEventListener('hashchange', () => {
      const next = read()
      if (next.route !== this.route) window.scrollTo({ top: 0 })
      this.route = next.route
      this.params = next.params
    })
  }

  go(route: Route, params?: Record<string, string>) {
    const query = params ? `?${new URLSearchParams(params)}` : ''
    location.hash = `/${route}${query}`
  }

  /** Como go(), pero sin dejar la ruta actual en el historial (para redirecciones). */
  replace(route: Route) {
    history.replaceState(history.state, '', `#/${route}`)
    this.route = route
    this.params = {}
  }
}

export const router = new Router()
