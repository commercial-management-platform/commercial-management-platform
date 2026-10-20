export class Cliente {
  constructor(
    public readonly idCliente: number | null,
    public nit: string,
    public razonSocial: string,
    public nombreComercial: string,
    public direccion: string,
    public departamento: string,
    public municipio: string,
    public barrio: string,
    public telefono: string,
    public email: string,
    public idZona: number,
    public idTipoCliente: number,
    public idPotencial: number,
    public idEstadoCliente: number,
    public frecuenciaVisitaDias: number,
    public fechaCreacion: Date,
    public activo: boolean,
  ) {}
}