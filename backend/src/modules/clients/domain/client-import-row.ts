import { isValidEmail } from '../../../shared/domain/email.js';
import { NIT_PATTERN } from './entities/client.js';

export interface ClientImportRowError {
  column: string;
  reason: string;
}

export interface ClientImportRowData {
  nit: string;
  businessName: string;
  tradeName: string | null;
  address: string | null;
  department: string | null;
  municipality: string | null;
  neighborhood: string | null;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  zone: string;
  clientType: string;
  clientPotential: string;
  clientStatus: string;
  visitFrequencyDays: number;
}

export interface ClientImportRowValidationResult {
  row: ClientImportRowData | null;
  errors: ClientImportRowError[];
}

export class ClientImportRow {
  static validate(raw: Record<string, string | undefined>): ClientImportRowValidationResult {
    const errors: ClientImportRowError[] = [];

    const get = (key: string) => {
      const value = raw[key];
      return value == null ? '' : String(value).trim();
    };

    const nit = get('nit');
    if (!nit) {
      errors.push({ column: 'nit', reason: 'nit is required' });
    } else if (!NIT_PATTERN.test(nit)) {
      errors.push({ column: 'nit', reason: 'nit format is invalid' });
    }

    const businessName = get('business_name');
    if (!businessName) {
      errors.push({ column: 'business_name', reason: 'business_name is required' });
    }

    const address = get('address');
    if (!address) {
      errors.push({ column: 'address', reason: 'address is required' });
    }

    const department = get('department');
    if (!department) {
      errors.push({ column: 'department', reason: 'department is required' });
    }

    const municipality = get('municipality');
    if (!municipality) {
      errors.push({ column: 'municipality', reason: 'municipality is required' });
    }

    const zone = get('zone');
    if (!zone) {
      errors.push({ column: 'zone', reason: 'zone is required' });
    }

    const clientType = get('client_type');
    if (!clientType) {
      errors.push({ column: 'client_type', reason: 'client_type is required' });
    }

    const clientPotential = get('client_potential');
    if (!clientPotential) {
      errors.push({ column: 'client_potential', reason: 'client_potential is required' });
    }

    const clientStatus = get('client_status');
    if (!clientStatus) {
      errors.push({ column: 'client_status', reason: 'client_status is required' });
    }

    const visitFrequencyDays = Number(get('visit_frequency_days'));
    if (!Number.isInteger(visitFrequencyDays) || visitFrequencyDays <= 0) {
      errors.push({
        column: 'visit_frequency_days',
        reason: 'visit_frequency_days must be a positive integer',
      });
    }

    const email = get('email');
    if (email && !isValidEmail(email)) {
      errors.push({ column: 'email', reason: 'email format is invalid' });
    }

    const latitude = get('latitude');
    if (latitude) {
      const value = Number(latitude);
      if (!Number.isFinite(value) || value < -90 || value > 90) {
        errors.push({
          column: 'latitude',
          reason: 'latitude must be between -90 and 90',
        });
      }
    }

    const longitude = get('longitude');
    if (longitude) {
      const value = Number(longitude);
      if (!Number.isFinite(value) || value < -180 || value > 180) {
        errors.push({
          column: 'longitude',
          reason: 'longitude must be between -180 and 180',
        });
      }
    }

    if (errors.length > 0) {
      return { row: null, errors };
    }

    return {
      row: {
        nit,
        businessName,
        tradeName: get('trade_name') || null,
        address,
        department,
        municipality,
        neighborhood: get('neighborhood') || null,
        phone: get('phone') || null,
        email: email || null,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        zone,
        clientType,
        clientPotential,
        clientStatus,
        visitFrequencyDays,
      },
      errors: [],
    };
  }
}
