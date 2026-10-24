import type { DataSource, EntityManager } from 'typeorm';
import type { Seed } from './seed.js';

/**
 * Demo data for the defense (HU-21 CA-04): client catalogs, contacts and
 * portfolios, plus routes, visits with results, quotes, sales orders,
 * follow-ups and their activity log, spread over the weeks around the
 * reference date so the dashboard, the map and the agenda have real data.
 *
 * Reference date: SEED_REFERENCE_DATE (YYYY-MM-DD) or today in America/Bogota.
 * Visits before it are mostly done (some cancelled or never visited), on it
 * the first one of each route is done and the rest scheduled, after it they
 * are all scheduled.
 *
 * Runs once: if any demo route already exists the whole seed is skipped. Every
 * insert runs in one transaction, so a failed run leaves nothing behind.
 */

const BUSINESS_TIME_ZONE = 'America/Bogota';
/** Bogota has no daylight saving time. */
const BUSINESS_UTC_OFFSET = '-05:00';
const DAYS_BACK = 21;
const DAYS_AHEAD = 6;
const VISITS_PER_ROUTE_DAY = 3;
const VISIT_TIMES = ['08:30', '10:30', '14:00'];
const DAY_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];
const MINUTE = 60_000;
const DAY = 86_400_000;

interface DemoRoute {
  name: string;
  zone: string;
  /** 1 = Monday ... 6 = Saturday. */
  days: number[];
  description: string;
  /** Clients in visit order. */
  nits: string[];
}

const ROUTES: DemoRoute[] = [
  {
    name: 'Ruta El Prado',
    zone: 'Norte',
    days: [1, 4],
    description: 'Comercio y servicios de El Prado y Alto Prado',
    nits: [
      '900481203-1',
      '900345781-6',
      '900765123-7',
      '900667890-4',
      '900889012-8',
      '901223874-5',
    ],
  },
  {
    name: 'Ruta Riomar',
    zone: 'Norte',
    days: [2, 5],
    description: 'Riomar, Villa Santos y la zona industrial de la Vía 40',
    nits: [
      '901778901-6',
      '800990123-0',
      '900212345-4',
      '901323456-6',
      '900223456-3',
    ],
  },
  {
    name: 'Ruta Centro y Soledad',
    zone: 'Sur',
    days: [1, 3, 5],
    description: 'Centro de Barranquilla y municipio de Soledad',
    nits: [
      '890112457-2',
      '800334567-5',
      '800562341-9',
      '901034562-8',
      '900445678-9',
      '901101234-2',
    ],
  },
  {
    name: 'Ruta Puerto Colombia y Malambo',
    zone: 'Metropolitana',
    days: [2, 4, 6],
    description: 'Clientes del área metropolitana fuera de Barranquilla',
    nits: ['901567234-0', '901112345-1', '800434567-8', '900874125-3'],
  },
];

/** Zone, client type and potential of each demo client (by NIT). */
const CLIENT_PROFILES: Record<
  string,
  [zone: string, type: string, potential: string]
> = {
  '900481203-1': ['Norte', 'Distribuidor', 'Alto'],
  '901223874-5': ['Norte', 'Retail', 'Medio'],
  '800562341-9': ['Sur', 'Distribuidor', 'Medio'],
  '900874125-3': ['Metropolitana', 'Industrial', 'Alto'],
  '901034562-8': ['Sur', 'Distribuidor', 'Alto'],
  '890112457-2': ['Centro', 'Industrial', 'Alto'],
  '900345781-6': ['Norte', 'Retail', 'Medio'],
  '901567234-0': ['Metropolitana', 'Retail', 'Bajo'],
  '800987452-4': ['Metropolitana', 'Industrial', 'Medio'],
  '900765123-7': ['Norte', 'Retail', 'Alto'],
  '901112345-1': ['Metropolitana', 'Industrial', 'Alto'],
  '900223456-3': ['Norte', 'Industrial', 'Alto'],
  '800334567-5': ['Centro', 'Distribuidor', 'Medio'],
  '900445678-9': ['Sur', 'Distribuidor', 'Bajo'],
  '901556789-2': ['Sur', 'Distribuidor', 'Bajo'],
  '900667890-4': ['Norte', 'Retail', 'Medio'],
  '901778901-6': ['Norte', 'Retail', 'Bajo'],
  '900889012-8': ['Norte', 'Retail', 'Bajo'],
  '800990123-0': ['Norte', 'Distribuidor', 'Medio'],
  '901101234-2': ['Sur', 'Retail', 'Medio'],
  '900212345-4': ['Norte', 'Retail', 'Medio'],
  '901323456-6': ['Norte', 'Retail', 'Bajo'],
  '800434567-8': ['Metropolitana', 'Distribuidor', 'Medio'],
  '900545678-1': ['Metropolitana', 'Distribuidor', 'Bajo'],
};

/** Products quoted for each portfolio, with their unit price in COP. */
const PRODUCTS: Record<string, [product: string, price: number][]> = {
  'Equipos industriales': [
    ['Compresor de aire 50 L', 1_850_000],
    ['Generador eléctrico 5 kVA', 4_200_000],
    ['Hidrolavadora industrial', 2_350_000],
  ],
  Herramientas: [
    ['Taladro percutor 800 W', 389_000],
    ['Pulidora 4-1/2"', 265_000],
    ['Juego de llaves mixtas x12', 148_000],
  ],
  Ferretería: [
    ['Caja de tornillos drywall x1000', 62_000],
    ['Cinta aislante x10', 35_000],
    ['Candado de seguridad 50 mm', 48_000],
  ],
  'Insumos de soldadura': [
    ['Electrodo 6013 x5 kg', 96_000],
    ['Careta fotosensible', 185_000],
    ['Alambre MIG 0,9 mm x15 kg', 320_000],
  ],
};

const CONTACT_NAMES = [
  'Mariana Gómez',
  'Julián Castro',
  'Paola Herrera',
  'Andrés Polo',
  'Camila Rojas',
  'Felipe Vargas',
  'Daniela Ortiz',
  'Sebastián Díaz',
  'Valentina Pérez',
  'Jorge Molina',
  'Natalia Ríos',
  'Ricardo Salas',
];
const CONTACT_TITLES = [
  'Jefe de compras',
  'Gerente general',
  'Coordinador de mantenimiento',
  'Administrador',
];

const OBSERVATIONS = {
  interested: [
    'El cliente pidió cotización para reponer inventario del próximo mes.',
    'Interesado en la nueva línea; solicita precios por volumen.',
    'Revisó el catálogo con el jefe de compras y pidió propuesta formal.',
  ],
  order: [
    'Se cerró el pedido durante la visita; entrega a convenir con bodega.',
    'Aprobó la propuesta y confirmó el pedido con orden de compra.',
  ],
  notInterested: [
    'Tiene inventario suficiente hasta el próximo trimestre.',
    'Trabaja con otro proveedor por precio; volver a visitar más adelante.',
    'El encargado de compras no estaba disponible para decidir.',
  ],
};

type VisitResult = 'Interesado' | 'Pedido' | 'No interesado';

interface ClientRow {
  id: number;
  nit: string;
  active: boolean;
  created_at: Date;
  latitude: string | null;
  longitude: string | null;
}

interface AdvisorRow {
  id: number;
  user_id: string;
  name: string;
}

export const demoDataSeed: Seed = {
  name: 'demo-data',
  async run(dataSource: DataSource): Promise<void> {
    const existing: unknown[] = await dataSource.query(
      `SELECT 1 FROM "route" WHERE "name" = ANY($1) LIMIT 1`,
      [ROUTES.map((route) => route.name)],
    );
    if (existing.length > 0) {
      console.log('  [demo-data] demo routes already exist, skipped');
      return;
    }

    const advisors: AdvisorRow[] = await dataSource.query(
      `SELECT "id", "user_id", "name" FROM "advisor" WHERE "status" = 'active' ORDER BY "id"`,
    );
    if (advisors.length === 0) {
      console.warn(
        '  [demo-data] skipped, there are no active advisors (run the users seed first)',
      );
      return;
    }

    const referenceDate = resolveReferenceDate();
    const counts = await dataSource.transaction((manager) =>
      seedDemoData(manager, advisors, referenceDate),
    );
    console.log(
      `  [demo-data] reference date ${referenceDate}: ${counts.routes} routes, ${counts.visits} visits, ` +
        `${counts.quotes} quotes, ${counts.orders} sales orders, ${counts.followUps} follow-ups`,
    );
  },
};

async function seedDemoData(
  manager: EntityManager,
  advisors: AdvisorRow[],
  referenceDate: string,
): Promise<
  Record<'routes' | 'visits' | 'quotes' | 'orders' | 'followUps', number>
> {
  const counts = { routes: 0, visits: 0, quotes: 0, orders: 0, followUps: 0 };
  const random = mulberry32(2026);
  const pick = <T>(items: readonly T[]): T =>
    items[Math.floor(random() * items.length)];

  const catalogs = {
    zone: await catalogIds(manager, 'zone'),
    clientType: await catalogIds(manager, 'client_type'),
    potential: await catalogIds(manager, 'client_potential'),
    status: await catalogIds(manager, 'client_status'),
    result: await catalogIds(manager, 'visit_result'),
    objective: await catalogIds(manager, 'visit_objective'),
    visitType: await catalogIds(manager, 'visit_type'),
    portfolio: await catalogIds(manager, 'portfolio'),
  };

  const clients: ClientRow[] = await manager.query(
    `SELECT "id", "nit", "active", "created_at", "latitude", "longitude"
     FROM "client" WHERE "nit" = ANY($1)`,
    [Object.keys(CLIENT_PROFILES)],
  );
  const clientByNit = new Map(clients.map((client) => [client.nit, client]));
  const isProspect = (client: ClientRow) =>
    Date.now() - client.created_at.getTime() < 15 * DAY;

  // 1. Catalogs of each client, only where the zone is still empty.
  for (const client of clients) {
    const [zone, type, potential] = CLIENT_PROFILES[client.nit];
    const status = !client.active
      ? 'Inactivo'
      : isProspect(client)
        ? 'Prospecto'
        : 'Activo';
    await manager.query(
      `UPDATE "client"
       SET "zone_id" = $2, "client_type_id" = $3, "client_potential_id" = $4, "client_status_id" = $5
       WHERE "id" = $1 AND "zone_id" IS NULL`,
      [
        client.id,
        catalogs.zone.get(zone),
        catalogs.clientType.get(type),
        catalogs.potential.get(potential),
        catalogs.status.get(status),
      ],
    );
  }

  // 2. A primary contact and one or two portfolios for clients that have none.
  const portfolioNames = [...catalogs.portfolio.keys()].filter(
    (name) => PRODUCTS[name],
  );
  const clientPortfolios = new Map<number, string[]>();
  for (const [index, client] of clients.entries()) {
    const name = CONTACT_NAMES[index % CONTACT_NAMES.length];
    await manager.query(
      `INSERT INTO "contact" ("client_id", "name", "job_title", "mobile", "email", "is_primary")
       SELECT $1, $2, $3, $4, $5, true
       WHERE NOT EXISTS (SELECT 1 FROM "contact" WHERE "client_id" = $1)`,
      [
        client.id,
        name,
        CONTACT_TITLES[index % CONTACT_TITLES.length],
        `300${String(4_100_000 + index * 7_919).padStart(7, '0')}`,
        `${slug(name)}@cliente.demo`,
      ],
    );

    const owned: { name: string }[] = await manager.query(
      `SELECT p."name" FROM "client_portfolio" cp JOIN "portfolio" p ON p."id" = cp."portfolio_id"
       WHERE cp."client_id" = $1`,
      [client.id],
    );
    if (owned.length > 0) {
      clientPortfolios.set(
        client.id,
        owned.map((row) => row.name),
      );
      continue;
    }
    const chosen = [portfolioNames[index % portfolioNames.length]];
    if (index % 2 === 0)
      chosen.push(portfolioNames[(index + 1) % portfolioNames.length]);
    for (const portfolio of chosen) {
      await manager.query(
        `INSERT INTO "client_portfolio" ("portfolio_id", "client_id") VALUES ($1, $2)`,
        [catalogs.portfolio.get(portfolio), client.id],
      );
    }
    clientPortfolios.set(client.id, chosen);
  }

  // 3. Routes, their clients and the visits of each execution day.
  const firstDay = addDays(referenceDate, -DAYS_BACK);
  for (const [routeIndex, route] of ROUTES.entries()) {
    const advisor = advisors[routeIndex % advisors.length];
    const routeClients = route.nits
      .map((nit) => clientByNit.get(nit))
      .filter((client): client is ClientRow => !!client && client.active);
    if (routeClients.length === 0) continue;

    const [{ id: routeId }]: { id: number }[] = await manager.query(
      `INSERT INTO "route" ("name", "zone_id", "execution_days", "frequency", "suggested_start_time",
         "suggested_end_time", "description", "advisor_id", "start_date", "status")
       VALUES ($1, $2, $3, 'Semanal', '08:00', '17:00', $4, $5, $6, 'active')
       RETURNING "id"`,
      [
        route.name,
        catalogs.zone.get(route.zone),
        route.days.map((day) => DAY_NAMES[day]).join(', '),
        route.description,
        advisor.id,
        addDays(firstDay, -7),
      ],
    );
    counts.routes++;
    for (const [order, client] of routeClients.entries()) {
      await manager.query(
        `INSERT INTO "route_client" ("route_id", "client_id", "visit_order") VALUES ($1, $2, $3)`,
        [routeId, client.id, order + 1],
      );
    }

    let next = 0;
    for (let offset = -DAYS_BACK; offset <= DAYS_AHEAD; offset++) {
      const date = addDays(referenceDate, offset);
      if (!route.days.includes(weekday(date))) continue;

      for (
        let slot = 0;
        slot < Math.min(VISITS_PER_ROUTE_DAY, routeClients.length);
        slot++
      ) {
        const order = next++ % routeClients.length;
        const client = routeClients[order];
        const scheduled = businessTime(date, VISIT_TIMES[slot]);
        const scheduledAt = new Date(
          Math.min(scheduled.getTime() - 3 * DAY, Date.now()),
        );
        // Past visits: about 10 % cancelled and 12 % never visited (still
        // scheduled), so the effectiveness KPI is not a flat 100 %.
        const pastRoll = offset < 0 ? random() : 1;
        const status =
          offset < 0
            ? pastRoll < 0.1
              ? 'cancelled'
              : pastRoll < 0.22
                ? 'scheduled'
                : 'visited'
            : offset === 0 && slot === 0
              ? 'visited'
              : 'scheduled';

        const [{ id: visitId }]: { id: number }[] = await manager.query(
          `INSERT INTO "visit" ("client_id", "advisor_id", "route_id", "scheduled_date", "visit_order",
             "status", "created_at", "updated_at")
           VALUES ($1, $2, $3, $4, $5, 'scheduled', $6, $6)
           RETURNING "id"`,
          [client.id, advisor.id, routeId, scheduled, order + 1, scheduledAt],
        );
        counts.visits++;
        await log(
          manager,
          client.id,
          advisor,
          'visit.scheduled',
          `Visit scheduled for ${date} from route '${routeId}'`,
          scheduledAt,
        );

        if (status === 'cancelled') {
          const cancelledAt = new Date(scheduled.getTime() - 2 * 60 * MINUTE);
          await manager.query(
            `UPDATE "visit" SET "status" = 'cancelled', "updated_at" = $2 WHERE "id" = $1`,
            [visitId, cancelledAt],
          );
          await log(
            manager,
            client.id,
            advisor,
            'visit.cancelled',
            `Visit scheduled for ${date} cancelled`,
            cancelledAt,
          );
          continue;
        }
        if (status === 'scheduled') continue;

        // Visit done: check-in at the client, outcome and what follows from it.
        const roll = random();
        const result: VisitResult =
          roll < 0.45 ? 'Interesado' : roll < 0.75 ? 'Pedido' : 'No interesado';
        const startedAt = new Date(
          scheduled.getTime() + (5 + Math.floor(random() * 15)) * MINUTE,
        );
        const finishedAt = new Date(
          startedAt.getTime() + (25 + Math.floor(random() * 25)) * MINUTE,
        );
        const interestLevel =
          result === 'Pedido'
            ? 'high'
            : result === 'Interesado'
              ? pick(['high', 'medium'])
              : 'low';
        const objective =
          result === 'Pedido'
            ? 'Cierre comercial'
            : result === 'Interesado'
              ? pick([
                  'Presentación de nueva línea',
                  'Seguimiento de cotización',
                ])
              : 'Presentación de nueva línea';
        const visitType = isProspect(client)
          ? 'Prospección'
          : pick(['Desarrollo de cliente', 'Seguimiento']);
        const jitter = () => (random() - 0.5) * 0.0008;

        await manager.query(
          `UPDATE "visit" SET "status" = 'visited', "actual_date" = $2, "started_at" = $3, "finished_at" = $2,
             "check_in_latitude" = $4, "check_in_longitude" = $5, "check_in_distance_m" = $6,
             "location_confirmed" = true, "visit_objective_id" = $7, "visit_type_id" = $8,
             "interest_level" = $9, "interest_reason" = $10, "competitor_mentioned" = $11, "updated_at" = $2
           WHERE "id" = $1`,
          [
            visitId,
            finishedAt,
            startedAt,
            client.latitude === null
              ? null
              : (Number(client.latitude) + jitter()).toFixed(6),
            client.longitude === null
              ? null
              : (Number(client.longitude) + jitter()).toFixed(6),
            10 + Math.floor(random() * 80),
            catalogs.objective.get(objective),
            catalogs.visitType.get(visitType),
            interestLevel,
            interestLevel === 'low'
              ? null
              : pick(['quality', 'price', 'quality_price']),
            result === 'No interesado' && random() < 0.5
              ? 'Ferretería Industrial del Caribe'
              : null,
          ],
        );
        const resultId = catalogs.result.get(result);
        const observation = pick(
          result === 'Pedido'
            ? OBSERVATIONS.order
            : result === 'Interesado'
              ? OBSERVATIONS.interested
              : OBSERVATIONS.notInterested,
        );
        await manager.query(
          `INSERT INTO "visit_outcome" ("visit_id", "visit_result_id", "observation", "created_at") VALUES ($1, $2, $3, $4)`,
          [visitId, resultId, observation, finishedAt],
        );
        await log(
          manager,
          client.id,
          advisor,
          'visit.completed',
          `Visit completed with result '${resultId}'`,
          finishedAt,
        );

        const age = -offset;
        let followUp: { days: number; activity: string };
        if (result === 'No interesado') {
          followUp = { days: 30, activity: 'Volver a presentar el portafolio' };
        } else {
          const quoteStatus =
            result === 'Pedido'
              ? 'approved'
              : age <= 1
                ? 'draft'
                : age < 7
                  ? 'sent'
                  : pick(['sent', 'approved', 'rejected'] as const);
          const quote = await insertQuote(manager, random, {
            clientId: client.id,
            advisor,
            visitId,
            date,
            status: quoteStatus,
            portfolios: clientPortfolios.get(client.id) ?? portfolioNames,
            createdAt: finishedAt,
          });
          counts.quotes++;

          if (result === 'Pedido') {
            const orderStatus =
              age >= 5 ? 'delivered' : age >= 1 ? 'confirmed' : 'pending';
            const orderNumber = await nextNumber(
              manager,
              'sales_order_number_seq',
              'PED',
            );
            const orderAt = new Date(finishedAt.getTime() + 10 * MINUTE);
            await manager.query(
              `INSERT INTO "sales_order" ("number", "client_id", "quote_id", "visit_id", "advisor_id", "date",
                 "value", "status", "estimated_delivery_date", "created_at", "updated_at")
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
              [
                orderNumber,
                client.id,
                quote.id,
                visitId,
                advisor.id,
                date,
                quote.value,
                orderStatus,
                addDays(date, 5),
                orderAt,
              ],
            );
            counts.orders++;
            await log(
              manager,
              client.id,
              advisor,
              'sales_order.created',
              `Sales order '${orderNumber}' created`,
              orderAt,
            );
            followUp = {
              days: 7,
              activity: `Confirmar la entrega del pedido ${orderNumber}`,
            };
          } else {
            followUp = {
              days: 4,
              activity: `Llamar para revisar la cotización ${quote.number}`,
            };
          }
        }

        const nextDate = addDays(date, followUp.days);
        const completed = nextDate < referenceDate;
        const [{ id: followUpId }]: { id: number }[] = await manager.query(
          `INSERT INTO "follow_up" ("visit_id", "next_date", "next_time", "activity", "responsible_advisor_id",
             "completed", "completed_at", "created_at", "updated_at")
           VALUES ($1, $2, '09:00', $3, $4, $5, $6, $7, $7)
           RETURNING "id"`,
          [
            visitId,
            nextDate,
            followUp.activity,
            advisor.id,
            completed,
            completed ? businessTime(nextDate, '09:30') : null,
            finishedAt,
          ],
        );
        counts.followUps++;
        await log(
          manager,
          client.id,
          advisor,
          'follow_up.created',
          `Follow-up created for visit ${visitId} (next ${nextDate} 09:00)`,
          finishedAt,
        );
        if (completed) {
          await log(
            manager,
            client.id,
            advisor,
            'follow_up.completed',
            `Follow-up ${followUpId} completed for visit ${visitId}`,
            businessTime(nextDate, '09:30'),
          );
        }
      }
    }
  }

  return counts;
}

async function insertQuote(
  manager: EntityManager,
  random: () => number,
  input: {
    clientId: number;
    advisor: AdvisorRow;
    visitId: number;
    date: string;
    status: 'draft' | 'sent' | 'approved' | 'rejected';
    portfolios: string[];
    createdAt: Date;
  },
): Promise<{ id: number; number: string; value: number }> {
  const products = input.portfolios.flatMap(
    (portfolio) => PRODUCTS[portfolio] ?? [],
  );
  const lines = new Map<string, [quantity: number, price: number]>();
  const lineCount = 1 + Math.floor(random() * 3);
  for (let i = 0; i < lineCount; i++) {
    const [product, price] = products[Math.floor(random() * products.length)];
    const quantity =
      price > 1_000_000
        ? 1 + Math.floor(random() * 2)
        : 2 + Math.floor(random() * 10);
    lines.set(product, [quantity, price]);
  }
  const value = [...lines.values()].reduce(
    (sum, [quantity, price]) => sum + quantity * price,
    0,
  );

  const number = await nextNumber(manager, 'quote_number_seq', 'COT');
  const [{ id }]: { id: number }[] = await manager.query(
    `INSERT INTO "quote" ("number", "client_id", "advisor_id", "visit_id", "date", "value", "status",
       "created_at", "updated_at")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
     RETURNING "id"`,
    [
      number,
      input.clientId,
      input.advisor.id,
      input.visitId,
      input.date,
      value,
      input.status,
      input.createdAt,
    ],
  );
  for (const [product, [quantity, price]] of lines) {
    await manager.query(
      `INSERT INTO "quote_detail" ("quote_id", "product", "quantity", "price", "subtotal", "created_at", "updated_at")
       VALUES ($1, $2, $3, $4, $5, $6, $6)`,
      [id, product, quantity, price, quantity * price, input.createdAt],
    );
  }

  await log(
    manager,
    input.clientId,
    input.advisor,
    'quote.created',
    `Quote '${number}' created`,
    input.createdAt,
  );
  // The quote moves draft -> sent -> approved/rejected, one log entry per step.
  const steps = {
    draft: [],
    sent: ['sent'],
    approved: ['sent', 'approved'],
    rejected: ['sent', 'rejected'],
  }[input.status];
  let previous = 'draft';
  for (const [index, step] of steps.entries()) {
    const at = new Date(input.createdAt.getTime() + (index + 1) * 5 * MINUTE);
    await log(
      manager,
      input.clientId,
      input.advisor,
      'quote.status_changed',
      `Quote '${number}' status changed from '${previous}' to '${step}'`,
      at,
    );
    previous = step;
  }
  return { id, number, value };
}

async function catalogIds(
  manager: EntityManager,
  table: string,
): Promise<Map<string, number>> {
  const rows: { id: number; name: string }[] = await manager.query(
    `SELECT "id", "name" FROM "${table}"`,
  );
  return new Map(rows.map((row) => [row.name, row.id]));
}

/** Same format the app uses: COT-0001, PED-0001. */
async function nextNumber(
  manager: EntityManager,
  sequence: string,
  prefix: string,
): Promise<string> {
  const [{ value }]: { value: string }[] = await manager.query(
    `SELECT nextval('"${sequence}"') AS value`,
  );
  return `${prefix}-${String(value).padStart(4, '0')}`;
}

async function log(
  manager: EntityManager,
  clientId: number,
  advisor: AdvisorRow,
  action: string,
  description: string,
  at: Date,
): Promise<void> {
  await manager.query(
    `INSERT INTO "activity_log" ("client_id", "created_at", "action", "user_id", "description") VALUES ($1, $2, $3, $4, $5)`,
    [clientId, at, action, advisor.user_id, description],
  );
}

function resolveReferenceDate(): string {
  const fromEnv = process.env.SEED_REFERENCE_DATE?.trim();
  if (fromEnv) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromEnv)) {
      throw new Error('SEED_REFERENCE_DATE must be YYYY-MM-DD');
    }
    return fromEnv;
  }
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
  }).format(new Date());
}

const addDays = (date: string, days: number): string =>
  new Date(Date.parse(`${date}T12:00:00Z`) + days * DAY)
    .toISOString()
    .slice(0, 10);

const weekday = (date: string): number =>
  new Date(`${date}T12:00:00Z`).getUTCDay();

const businessTime = (date: string, time: string): Date =>
  new Date(`${date}T${time}:00${BUSINESS_UTC_OFFSET}`);

const slug = (name: string): string =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '.');

/** Small deterministic PRNG, so every run produces the same demo data. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}
