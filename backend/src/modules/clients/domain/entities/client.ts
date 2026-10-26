/**
 * Colombian NIT: 9 base digits plus an optional verification digit, with an
 * optional hyphen between them (e.g. 900123456 or 900123456-5).
 */
export const NIT_PATTERN = /^[0-9]{9}(-?[0-9])?$/;

export interface ClientProps {
  id: number | null;
  /** Colombian tax ID. Unique per client. */
  nit: string;
  businessName: string;
  tradeName: string | null;
  address: string | null;
  department: string | null;
  municipality: string | null;
  neighborhood: string | null;
  phone: string | null;
  email: string | null;
  zoneId: number | null;
  clientTypeId: number | null;
  clientPotentialId: number | null;
  clientStatusId: number | null;
  visitFrequencyDays: number | null;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
  /** Set by the database on insert; null until the client is saved. */
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class Client {
  readonly id: number | null;
  nit: string;
  businessName: string;
  tradeName: string | null;
  address: string | null;
  department: string | null;
  municipality: string | null;
  neighborhood: string | null;
  phone: string | null;
  email: string | null;
  zoneId: number | null;
  clientTypeId: number | null;
  clientPotentialId: number | null;
  clientStatusId: number | null;
  visitFrequencyDays: number | null;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
  readonly createdAt: Date | null;
  updatedAt: Date | null;

  constructor(props: ClientProps) {
    this.id = props.id;
    this.nit = props.nit;
    this.businessName = props.businessName;
    this.tradeName = props.tradeName;
    this.address = props.address;
    this.department = props.department;
    this.municipality = props.municipality;
    this.neighborhood = props.neighborhood;
    this.phone = props.phone;
    this.email = props.email;
    this.zoneId = props.zoneId;
    this.clientTypeId = props.clientTypeId;
    this.clientPotentialId = props.clientPotentialId;
    this.clientStatusId = props.clientStatusId;
    this.visitFrequencyDays = props.visitFrequencyDays;
    this.latitude = props.latitude;
    this.longitude = props.longitude;
    this.active = props.active;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
