import type { Route } from './router.svelte'
import { session } from './stores/session.svelte'

// Permisos del frontend en un solo lugar (matriz de HU-02). Solo deciden qué
// se muestra: el backend vuelve a verificar cada operación.
//
// El equipo acordó dos perfiles: el gestor (director, y admin mientras exista
// en el backend) administra; el asesor consulta lo suyo y actualiza sus clientes.

/** Pantallas que solo ve el gestor. El resto las ven todos los roles. */
const MANAGER_ROUTES: readonly Route[] = ['rutas/crear', 'rutas/asesores']
/** Pantallas solo del admin: el backend reserva /users y la escritura de catálogos a ese rol. */
const ADMIN_ROUTES: readonly Route[] = ['administracion']

class Permissions {
  isManager = $derived(session.hasRole('admin', 'director'))
  isAdvisor = $derived(session.hasRole('advisor'))

  // Clientes (HU-03, HU-04): el asesor consulta y edita los de sus rutas, pero no crea.
  createClient = $derived(this.isManager)
  toggleClient = $derived(this.isManager)
  manageContacts = $derived(this.isManager)

  // Portafolios (HU-06): todos consultan; solo el gestor asocia y retira clientes.
  managePortfolios = $derived(this.isManager)

  // Rutas (HU-07): solo el gestor crea, edita y asigna; el asesor consulta las suyas.
  manageRoutes = $derived(this.isManager)

  /** GET /users hoy solo lo permite el admin en el backend; el director recibe 403. */
  listUsers = $derived(session.hasRole('admin'))

  // Usuarios (HU-02) y zonas (HU-05): solo el admin.
  isAdmin = $derived(session.hasRole('admin'))

  visit(route: Route) {
    if (ADMIN_ROUTES.includes(route)) return this.isAdmin
    return this.isManager || !MANAGER_ROUTES.includes(route)
  }
}

export const can = new Permissions()
