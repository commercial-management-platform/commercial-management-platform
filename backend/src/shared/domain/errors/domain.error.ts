/** Base class for business errors. Pure TypeScript: no framework imports. */
export abstract class DomainError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
