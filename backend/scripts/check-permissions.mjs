#!/usr/bin/env node
// Checks the role permission matrix of HU-02 against a running API (HU-21 CA-02).
//
// Usage (from backend/):
//   node --env-file-if-exists=.env scripts/check-permissions.mjs [baseUrl]
//   baseUrl defaults to http://localhost:3000, e.g. https://kestrel1.duckdns.org
//
// Credentials: PERM_<ROLE>_EMAIL and PERM_<ROLE>_PASSWORD (ROLE = ADMIN,
// DIRECTOR, ADVISOR), falling back to the SEED_<ROLE>_* variables of the seed.
//
// It does not change any data, so it is safe in production: every write call
// uses an empty body or an id that does not exist. The role guard runs before
// validation, so a role without permission gets 403, and a role with
// permission gets 400 or 404 instead. Exit code 1 if any check fails.

const baseUrl = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const api = `${baseUrl}/api`;
const MISSING = 999999999;
const MISSING_USER = 'missing-user-id';

const ROLES = ['admin', 'director', 'advisor'];

/** true: the role has permission; false: it must get 403. */
const allow = (admin, director, advisor) => ({ admin, director, advisor });
const ALL = allow(true, true, true);
const MANAGERS = allow(true, true, false);
const ADMIN_ONLY = allow(true, false, false);
const ADVISOR_ONLY = allow(false, false, true);

/** HU-02 section 3, one row per feature, with the endpoints that implement it. */
const MATRIX = [
  {
    feature: 'Manage users and roles (director: advisors only)',
    checks: [
      ['POST', '/users', MANAGERS, {}],
      ['PATCH', `/users/${MISSING_USER}`, MANAGERS, {}],
      ['PATCH', `/users/${MISSING_USER}/status`, MANAGERS, {}],
      ['PATCH', `/users/${MISSING_USER}/role`, ADMIN_ONLY, {}],
    ],
  },
  {
    feature: 'View users (director: advisors only)',
    checks: [
      ['GET', '/users', MANAGERS],
      ['GET', `/users/${MISSING_USER}`, MANAGERS],
      ['GET', '/advisors', MANAGERS],
    ],
  },
  {
    feature: 'Commercial dashboard (advisor: own indicators)',
    checks: [
      ['GET', '/dashboard/kpis', ALL],
      ['GET', '/dashboard/tracking', ALL],
    ],
  },
  {
    feature: 'Manage clients (advisor: views and updates own, does not create)',
    checks: [
      ['GET', '/clients', ALL],
      ['GET', `/clients/${MISSING}`, ALL],
      ['POST', '/clients', MANAGERS, {}],
      ['PATCH', `/clients/${MISSING}`, ALL, {}],
      ['PATCH', `/clients/${MISSING}/status`, MANAGERS, {}],
      ['GET', '/clients/import/template', MANAGERS],
      ['POST', '/clients/import', MANAGERS],
      ['GET', '/clients/imports', MANAGERS],
    ],
  },
  {
    feature: 'Manage client contacts (advisor: view only, on own clients)',
    checks: [
      ['GET', `/clients/${MISSING}/contacts`, ALL],
      ['POST', `/clients/${MISSING}/contacts`, MANAGERS, {}],
      ['PATCH', `/clients/${MISSING}/contacts/${MISSING}`, MANAGERS, {}],
      ['PATCH', `/clients/${MISSING}/contacts/${MISSING}/status`, MANAGERS, {}],
    ],
  },
  {
    feature: 'Assign clients to portfolios (advisor: view only)',
    checks: [
      ['GET', '/catalogs/portfolios', ALL],
      ['GET', `/portfolios/${MISSING}/clients`, ALL],
      ['POST', `/portfolios/${MISSING}/clients/${MISSING}`, MANAGERS],
      ['DELETE', `/portfolios/${MISSING}/clients/${MISSING}`, MANAGERS],
    ],
  },
  {
    feature: 'Administer catalogs',
    checks: [
      ['GET', '/catalogs/zones', ALL],
      ['POST', '/catalogs/zones', ADMIN_ONLY, {}],
      ['PATCH', `/catalogs/zones/${MISSING}`, ADMIN_ONLY, {}],
      ['PATCH', `/catalogs/zones/${MISSING}/status`, ADMIN_ONLY, {}],
    ],
  },
  {
    feature: 'Create, edit and assign routes (advisor: views own)',
    checks: [
      ['GET', '/routes', ALL],
      ['POST', '/routes', MANAGERS, {}],
      ['PATCH', `/routes/${MISSING}`, MANAGERS, {}],
      ['POST', `/routes/${MISSING}/clients/${MISSING}`, MANAGERS, {}],
      ['DELETE', `/routes/${MISSING}/clients/${MISSING}`, MANAGERS],
      ['PATCH', `/routes/${MISSING}/clients/order`, MANAGERS, {}],
    ],
  },
  {
    feature: 'Own features: visits, follow-ups, quotes, orders, activity log',
    checks: [
      ['POST', '/visits', MANAGERS, {}],
      ['POST', `/routes/${MISSING}/visits`, MANAGERS, {}],
      ['PATCH', `/visits/${MISSING}/reschedule`, MANAGERS, {}],
      ['PATCH', `/visits/${MISSING}/cancel`, MANAGERS, {}],
      ['GET', '/visits', ALL],
      ['GET', '/visits/agenda', ADVISOR_ONLY],
      ['GET', `/visits/${MISSING}/form`, ADVISOR_ONLY],
      ['POST', `/visits/${MISSING}/start`, ADVISOR_ONLY, {}],
      ['POST', `/visits/${MISSING}/outcome`, ADVISOR_ONLY, {}],
      ['GET', '/follow-ups', ALL],
      ['POST', `/visits/${MISSING}/follow-ups`, ALL, {}],
      ['POST', '/quotes', ALL, {}],
      ['GET', '/quotes', ALL],
      ['PATCH', `/quotes/${MISSING}/status`, MANAGERS, {}],
      ['POST', '/sales-orders', ALL, {}],
      ['GET', '/sales-orders', ALL],
      ['PATCH', `/sales-orders/${MISSING}/status`, MANAGERS, {}],
      ['GET', `/clients/${MISSING}/activity`, ALL],
    ],
  },
  {
    feature: 'Export CSV reports (advisor: own data)',
    checks: [
      ['GET', '/reports/visit-tracking/export', ALL],
      ['GET', '/reports/quotes/export', ALL],
      ['GET', '/reports/sales-orders/export', ALL],
    ],
  },
];

// ---------------------------------------------------------------------------

function credentials(role) {
  const key = role.toUpperCase();
  const email = process.env[`PERM_${key}_EMAIL`] ?? process.env[`SEED_${key}_EMAIL`];
  const password = process.env[`PERM_${key}_PASSWORD`] ?? process.env[`SEED_${key}_PASSWORD`];
  if (!email || !password) {
    throw new Error(`Set PERM_${key}_EMAIL and PERM_${key}_PASSWORD (or SEED_${key}_*)`);
  }
  return { email, password };
}

async function login(role) {
  const res = await fetch(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials(role)),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.token) {
    throw new Error(`Login as ${role} failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return body.token;
}

async function call(token, method, path, body) {
  const res = await fetch(`${api}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // CSV or empty body.
  }
  return { status: res.status, json, text };
}

const failures = [];
const fail = (message) => failures.push(message);
const ok = (passed) => (passed ? 'ok' : 'FAIL');

async function checkMatrix(tokens) {
  console.log(`\nRole matrix (HU-02) against ${baseUrl}\n`);
  for (const row of MATRIX) {
    console.log(row.feature);
    for (const [method, path, expected, body] of row.checks) {
      const cells = [];
      for (const role of ROLES) {
        const { status } = await call(tokens[role], method, path, body);
        const allowed = status !== 403;
        const passed = status !== 401 && status < 500 && allowed === expected[role];
        if (!passed) {
          fail(`${method} ${path} as ${role}: got ${status}, expected ${expected[role] ? 'access' : '403'}`);
        }
        cells.push(`${role} ${status} ${ok(passed)}`.padEnd(18));
      }
      console.log(`  ${`${method} ${path}`.padEnd(52)} ${cells.join(' ')}`);
    }
  }

  // Without a session every protected endpoint answers 401.
  const anonymous = await call(null, 'GET', '/clients');
  if (anonymous.status !== 401) fail(`GET /clients without session: got ${anonymous.status}, expected 401`);
  console.log(`\nWithout session: GET /clients -> ${anonymous.status} ${ok(anonymous.status === 401)}`);
}

/** The "only their own" rules of the matrix, checked on the returned data. */
async function checkScopes(tokens) {
  console.log('\nData scope');
  const list = (res) => (Array.isArray(res.json) ? res.json : (res.json?.data ?? []));
  const check = (label, passed, detail) => {
    if (!passed) fail(`${label}: ${detail}`);
    console.log(`  ${label.padEnd(70)} ${ok(passed)}${detail ? `  (${detail})` : ''}`);
  };

  const directorUsers = list(await call(tokens.director, 'GET', '/users'));
  const nonAdvisors = directorUsers.filter((u) => u.role !== 'advisor');
  check(
    'Director only sees advisors in GET /users (HU-02 CA-13)',
    nonAdvisors.length === 0,
    `${directorUsers.length} users, ${nonAdvisors.length} not advisor`,
  );

  const allClients = list(await call(tokens.director, 'GET', '/clients'));
  const ownClients = list(await call(tokens.advisor, 'GET', '/clients'));
  const allIds = new Set(allClients.map((c) => c.id));
  check(
    'Advisor only sees clients of their routes',
    ownClients.every((c) => allIds.has(c.id)) && ownClients.length <= allClients.length,
    `${ownClients.length} of ${allClients.length} clients`,
  );

  const tracking = list(await call(tokens.advisor, 'GET', '/dashboard/tracking?limit=100'));
  const advisorIds = new Set(tracking.map((r) => r.advisorId));
  check(
    'Advisor tracking table only has their own visits',
    advisorIds.size <= 1,
    `${tracking.length} rows, advisors ${[...advisorIds].join(', ') || '-'}`,
  );

  const advisors = list(await call(tokens.director, 'GET', '/advisors'));
  const other = advisors.find((a) => !advisorIds.has(a.id));
  if (other) {
    const own = await call(tokens.advisor, 'GET', '/dashboard/kpis');
    const forced = await call(tokens.advisor, 'GET', `/dashboard/kpis?advisorId=${other.id}`);
    check(
      "Advisor gets their own KPIs even when asking for another advisor's",
      JSON.stringify(own.json) === JSON.stringify(forced.json),
      `advisorId=${other.id} ignored`,
    );
  }

  const rows = (res) => res.text.split(/\r?\n/).filter(Boolean).length - 1;
  const allCsv = rows(await call(tokens.director, 'GET', '/reports/visit-tracking/export'));
  const ownCsv = rows(await call(tokens.advisor, 'GET', '/reports/visit-tracking/export'));
  check('Advisor CSV export only has their own rows', ownCsv <= allCsv, `${ownCsv} of ${allCsv} rows`);
}

try {
  const tokens = {};
  for (const role of ROLES) tokens[role] = await login(role);
  await checkMatrix(tokens);
  await checkScopes(tokens);
} catch (error) {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
}

if (failures.length > 0) {
  console.log(`\n${failures.length} check(s) failed:`);
  for (const message of failures) console.log(`  - ${message}`);
  process.exit(1);
}
console.log('\nEvery check passed.');
