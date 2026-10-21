import { mockServer } from './mock/server'

// Punto único de acceso a datos. Hoy apunta al servidor simulado; cuando el
// backend NestJS esté listo, implementar este mismo contrato con fetch + WebSocket/SSE:
//   - fetchDashboard  -> GET  /dashboard
//   - subscribe       -> conexión en tiempo real que entrega LiveEvent
//   - scheduleVisit   -> POST /visitas  (el backend luego emite 'visit.scheduled')
//   - fetchPlanningData -> GET /planeacion (clientes, asesores, bodega)
//   - createRoute     -> POST /rutas      (luego emite 'route.created')
//   - fetchRoutes     -> GET  /rutas      (rutas de la semana, asesores y clientes)
//   - fetchClients / fetchClientHistory -> GET /clientes, GET /clientes/:id/historial
//   - createClient / updateClient       -> POST /clientes, PUT /clientes/:id (emiten 'client.*')
//   - fetchQuotes / createQuote / updateQuoteStatus -> /cotizaciones (emiten 'quote.*')
//   - fetchOrders / createOrder / updateOrderStatus -> /pedidos      (emiten 'order.*')
//   - registerVisit   -> POST /visitas/registro (visita + cliente + ruta + cotización/pedido)
export const api = mockServer
