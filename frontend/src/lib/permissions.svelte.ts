import type { Route } from './router.svelte'
import { session } from './stores/session.svelte'

// Permisos del frontend en un solo lugar (matriz de HU-02). Solo deciden qué
// se muestra: el backend vuelve a verificar cada operación.
//
// El equipo acordó dos perfiles: el gestor (director, y admin mientras exista
// en el backend) administra; el asesor consulta lo suyo y actualiza sus clientes.

/**
 * Pantallas que solo ve el gestor. El resto las ven todos los roles.
 * Administración: el admin gestiona todos los usuarios y las zonas; el director,
 * solo los asesores (HU-02 CA-13).
 */
const MANAGER_ROUTES: readonly Route[] = ['rutas/crear', 'rutas/asesores', 'administracion']

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

  isAdmin = $derived(session.hasRole('admin'))

  // Usuarios (HU-02): el admin, todos; el director, solo asesores. GET /users le
  // devuelve al director únicamente asesores, y el backend rechaza cualquier otro rol.
  listUsers = $derived(this.isManager)
  manageUsers = $derived(this.isManager)
  /** Elegir o cambiar el rol de un usuario: solo el admin. */
  assignRoles = $derived(this.isAdmin)

  // Zonas (HU-05): el único catálogo editable, solo el admin.
  manageZones = $derived(this.isAdmin)

  visit(route: Route) {
    return this.isManager || !MANAGER_ROUTES.includes(route)
  }
}

export const can = new Permissions()
