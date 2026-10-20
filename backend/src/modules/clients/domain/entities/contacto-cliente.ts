export class ContactoCliente {
  constructor(
    public readonly idContacto: number | null,
    public idCliente: number,
    public nombre: string,
    public cargo: string,
    public telefono: string,
    public celular: string,
    public email: string,
    public principal: boolean,
  ) {}
}
