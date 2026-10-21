import type { DataSource } from 'typeorm';
import type { Seed } from './seed.js';

interface SeedClient {
  nit: string;
  businessName: string;
  tradeName: string;
  address: string;
  municipality: string;
  neighborhood: string;
  phone: string;
  email: string;
  visitFrequencyDays: number;
  latitude: number;
  longitude: number;
  active: boolean;
  /** Days before today the client was registered. */
  createdDaysAgo: number;
}

/**
 * Demo clients from the Barranquilla metropolitan area (Atlántico).
 * Fictitious companies with real-looking addresses and coordinates for the map view.
 * Catalog ids (zone, type, potential, status) stay null until HU-05 adds the catalogs.
 */
const CLIENTS: SeedClient[] = [
  { nit: '900481203-1', businessName: 'Grupo Horizonte S.A.S', tradeName: 'Grupo Horizonte', address: 'Cra. 54 #68-196', municipality: 'Barranquilla', neighborhood: 'El Prado', phone: '6053456781', email: 'compras@grupohorizonte.co', visitFrequencyDays: 7, latitude: 10.9925, longitude: -74.8031, active: true, createdDaysAgo: 3 },
  { nit: '901223874-5', businessName: 'Nova Tech Soluciones S.A.S', tradeName: 'Nova Tech', address: 'Calle 84 #51B-15', municipality: 'Barranquilla', neighborhood: 'Alto Prado', phone: '6053982210', email: 'contacto@novatech.co', visitFrequencyDays: 15, latitude: 11.0038, longitude: -74.8113, active: true, createdDaysAgo: 8 },
  { nit: '800562341-9', businessName: 'Comercial Rivera Ltda.', tradeName: 'Comercial Rivera', address: 'Cra. 30 #18-45', municipality: 'Soledad', neighborhood: 'Centro', phone: '6053124578', email: 'ventas@comercialrivera.co', visitFrequencyDays: 15, latitude: 10.9182, longitude: -74.7712, active: true, createdDaysAgo: 41 },
  { nit: '900874125-3', businessName: 'Acero Central S.A.S', tradeName: 'Acero Central', address: 'Calle 12 #20-11', municipality: 'Malambo', neighborhood: 'Caracolí', phone: '6053769012', email: 'compras@acerocentral.co', visitFrequencyDays: 30, latitude: 10.8595, longitude: -74.7738, active: true, createdDaysAgo: 96 },
  { nit: '901034562-8', businessName: 'Distribuidora Costa S.A.S', tradeName: 'Distribuidora Costa', address: 'Cra. 21 #55-30', municipality: 'Soledad', neighborhood: 'Hipódromo', phone: '6053651234', email: 'pedidos@districosta.co', visitFrequencyDays: 15, latitude: 10.9053, longitude: -74.7895, active: true, createdDaysAgo: 150 },
  { nit: '890112457-2', businessName: 'Lácteos del Caribe S.A.', tradeName: 'Lácteos del Caribe', address: 'Calle 30 #1-25', municipality: 'Barranquilla', neighborhood: 'Barranquillita', phone: '6053701122', email: 'abastecimiento@lacteoscaribe.co', visitFrequencyDays: 7, latitude: 10.9586, longitude: -74.7768, active: true, createdDaysAgo: 210 },
  { nit: '900345781-6', businessName: 'Supermercados La 72 S.A.S', tradeName: 'Supermercado La 72', address: 'Calle 72 #46-30', municipality: 'Barranquilla', neighborhood: 'El Prado', phone: '6053581190', email: 'compras@super72.co', visitFrequencyDays: 15, latitude: 10.9986, longitude: -74.8001, active: true, createdDaysAgo: 12 },
  { nit: '901567234-0', businessName: 'Ferretería El Puerto S.A.S', tradeName: 'Ferretería El Puerto', address: 'Cra. 5 #3-40', municipality: 'Puerto Colombia', neighborhood: 'Centro', phone: '6053091547', email: 'info@ferreelpuerto.co', visitFrequencyDays: 30, latitude: 10.9878, longitude: -74.9545, active: true, createdDaysAgo: 63 },
  { nit: '800987452-4', businessName: 'Textiles Atlántico S.A.', tradeName: 'Textiles Atlántico', address: 'Calle 9 #14-22', municipality: 'Galapa', neighborhood: 'Centro', phone: '6053457812', email: 'compras@textilesatlantico.co', visitFrequencyDays: 30, latitude: 10.8983, longitude: -74.8836, active: false, createdDaysAgo: 320 },
  { nit: '900765123-7', businessName: 'Clínica Bellavista S.A.S', tradeName: 'Clínica Bellavista', address: 'Cra. 51B #79-150', municipality: 'Barranquilla', neighborhood: 'Alto Prado', phone: '6053672300', email: 'suministros@clinicabellavista.co', visitFrequencyDays: 15, latitude: 10.9968, longitude: -74.8082, active: true, createdDaysAgo: 5 },
  { nit: '901112345-1', businessName: 'Constructora Mar Azul S.A.S', tradeName: 'Constructora Mar Azul', address: 'Km 2 Vía al Mar', municipality: 'Puerto Colombia', neighborhood: 'Pradomar', phone: '6053214567', email: 'obras@marazul.co', visitFrequencyDays: 15, latitude: 11.0096, longitude: -74.9105, active: true, createdDaysAgo: 75 },
  { nit: '900223456-3', businessName: 'Induacero S.A.S', tradeName: 'Induacero', address: 'Vía 40 #77-200', municipality: 'Barranquilla', neighborhood: 'Zona Industrial', phone: '6053886655', email: 'compras@induacero.co', visitFrequencyDays: 7, latitude: 10.9998, longitude: -74.786, active: true, createdDaysAgo: 2 },
  { nit: '800334567-5', businessName: 'Ferretería Central Ltda.', tradeName: 'Ferretería Central', address: 'Calle 45 #41-12', municipality: 'Barranquilla', neighborhood: 'Centro', phone: '6053401234', email: 'ventas@ferrecentral.co', visitFrequencyDays: 15, latitude: 10.98, longitude: -74.784, active: true, createdDaysAgo: 180 },
  { nit: '900445678-9', businessName: 'Prodeco Ltda.', tradeName: 'Prodeco', address: 'Cra. 14 #30-55', municipality: 'Soledad', neighborhood: 'Las Moras', phone: '6053456712', email: 'contacto@prodeco.co', visitFrequencyDays: 30, latitude: 10.912, longitude: -74.781, active: true, createdDaysAgo: 18 },
  { nit: '901556789-2', businessName: 'Suministros del Caribe S.A.S', tradeName: 'Suministros del Caribe', address: 'Calle 8 #12-40', municipality: 'Malambo', neighborhood: 'Centro', phone: '6053789045', email: 'pedidos@sumicaribe.co', visitFrequencyDays: 30, latitude: 10.862, longitude: -74.779, active: false, createdDaysAgo: 400 },
  { nit: '900667890-4', businessName: 'Hotel Prado Mar S.A.S', tradeName: 'Hotel Prado Mar', address: 'Cra. 54 #70-10', municipality: 'Barranquilla', neighborhood: 'El Prado', phone: '6053601020', email: 'compras@hotelpradomar.co', visitFrequencyDays: 15, latitude: 10.9952, longitude: -74.8019, active: true, createdDaysAgo: 34 },
  { nit: '901778901-6', businessName: 'Droguería Riomar S.A.S', tradeName: 'Droguería Riomar', address: 'Calle 98 #52-115', municipality: 'Barranquilla', neighborhood: 'Riomar', phone: '6053789900', email: 'pedidos@drogueriariomar.co', visitFrequencyDays: 7, latitude: 11.0125, longitude: -74.8205, active: true, createdDaysAgo: 9 },
  { nit: '900889012-8', businessName: 'Café Malecón S.A.S', tradeName: 'Café Malecón', address: 'Calle 72 #57-43', municipality: 'Barranquilla', neighborhood: 'El Prado', phone: '6053334455', email: 'hola@cafemalecon.co', visitFrequencyDays: 15, latitude: 10.9991, longitude: -74.8042, active: true, createdDaysAgo: 1 },
  { nit: '800990123-0', businessName: 'Logística del Norte S.A.S', tradeName: 'Logística del Norte', address: 'Cra. 38 #110-45', municipality: 'Barranquilla', neighborhood: 'Villa Santos', phone: '6053228899', email: 'operaciones@lognorte.co', visitFrequencyDays: 30, latitude: 11.0201, longitude: -74.8352, active: true, createdDaysAgo: 120 },
  { nit: '901101234-2', businessName: 'Panificadora San José S.A.S', tradeName: 'Panadería San José', address: 'Calle 17 #9-33', municipality: 'Soledad', neighborhood: 'San Antonio', phone: '6053119922', email: 'compras@pansanjose.co', visitFrequencyDays: 7, latitude: 10.9145, longitude: -74.7652, active: true, createdDaysAgo: 22 },
  { nit: '900212345-4', businessName: 'Muebles Barú S.A.S', tradeName: 'Muebles Barú', address: 'Cra. 43 #84-160', municipality: 'Barranquilla', neighborhood: 'Los Nogales', phone: '6053505566', email: 'ventas@mueblesbaru.co', visitFrequencyDays: 30, latitude: 11.0025, longitude: -74.8155, active: true, createdDaysAgo: 260 },
  { nit: '901323456-6', businessName: 'Óptica Visión Plus S.A.S', tradeName: 'Óptica Visión Plus', address: 'Calle 76 #54-21', municipality: 'Barranquilla', neighborhood: 'El Recreo', phone: '6053684321', email: 'contacto@visionplus.co', visitFrequencyDays: 30, latitude: 10.9973, longitude: -74.8071, active: true, createdDaysAgo: 4 },
  { nit: '800434567-8', businessName: 'Agroinsumos del Norte S.A.', tradeName: 'Agroinsumos del Norte', address: 'Calle 20 #18-30', municipality: 'Sabanalarga', neighborhood: 'Centro', phone: '6053876543', email: 'ventas@agronorte.co', visitFrequencyDays: 60, latitude: 10.6319, longitude: -74.922, active: true, createdDaysAgo: 540 },
  { nit: '900545678-1', businessName: 'Inversiones Bahía S.A.S', tradeName: 'Inversiones Bahía', address: 'Cra. 8 #12-40', municipality: 'Puerto Colombia', neighborhood: 'Salgar', phone: '6053091188', email: 'admin@invbahia.co', visitFrequencyDays: 30, latitude: 11.0168, longitude: -74.9461, active: false, createdDaysAgo: 85 },
];

/** Inserts the demo clients. Existing NITs are left untouched, so it can run many times. */
export const clientsSeed: Seed = {
  name: 'clients',
  async run(dataSource: DataSource): Promise<void> {
    let created = 0;

    for (const client of CLIENTS) {
      const createdAt = new Date(Date.now() - client.createdDaysAgo * 86_400_000);
      const rows: unknown[] = await dataSource.query(
        `INSERT INTO "client" (
           "nit", "business_name", "trade_name", "address", "department", "municipality",
           "neighborhood", "phone", "email", "visit_frequency_days", "latitude", "longitude",
           "active", "created_at", "updated_at"
         ) VALUES ($1, $2, $3, $4, 'Atlántico', $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
         ON CONFLICT ("nit") DO NOTHING
         RETURNING "id"`,
        [
          client.nit,
          client.businessName,
          client.tradeName,
          client.address,
          client.municipality,
          client.neighborhood,
          client.phone,
          client.email,
          client.visitFrequencyDays,
          client.latitude,
          client.longitude,
          client.active,
          createdAt,
        ],
      );
      if (rows.length > 0) created++;
    }

    console.log(
      `  [clients] ${created} created, ${CLIENTS.length - created} already existed`,
    );
  },
};
