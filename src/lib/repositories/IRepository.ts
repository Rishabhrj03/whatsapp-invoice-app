/**
 * Repository Pattern — abstracts all DB operations behind typed interfaces.
 *
 * SOLID applied:
 *  - SRP : each repository owns one entity's data access
 *  - OCP : extend by adding new repos, not modifying existing ones
 *  - LSP : concrete repos can substitute the base interface
 *  - ISP : IReadRepository / IWriteRepository split keeps consumers lean
 *  - DIP : server actions / services depend on this interface, not Mongoose directly
 */
export interface IReadRepository<T, ID = string> {
    findById(id: ID): Promise<T | null>;
    findAll(filter?: Partial<T>): Promise<T[]>;
}

export interface IWriteRepository<T, CreateDTO, ID = string> {
    create(dto: CreateDTO): Promise<T>;
    update(id: ID, dto: Partial<CreateDTO>): Promise<T | null>;
    delete(id: ID): Promise<boolean>;
}

export interface IRepository<T, CreateDTO, ID = string>
    extends IReadRepository<T, ID>,
        IWriteRepository<T, CreateDTO, ID> {}
