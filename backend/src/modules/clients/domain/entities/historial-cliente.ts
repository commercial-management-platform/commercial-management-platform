export class HistorialCliente {
  constructor(
    public readonly idHistorial: number | null,
    public idCliente: number,
    public fecha: Date,
    public accion: string,
    public usuario: string,
    public descripcion: string,
  ) {}
}
