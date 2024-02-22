import { UUID, randomUUID } from 'node:crypto';

export type EntityID = UUID;
export const randomEntityID = (): EntityID => {
  return randomUUID();
};

export interface TableRow {
  readonly id: EntityID;
}

class Table<T extends TableRow> {
  private items: { [key: EntityID]: T } = {};

  add(data: object): T {
    const id = randomEntityID();
    const row = { ...data, id } as T;
    return (this.items[id] = row);
  }

  delete(id: EntityID): boolean {
    return delete this.items[id];
  }

  update(id: EntityID, data: T): T {
    const item = this.get(id);
    data = { ...(item ?? {}), ...data } as T;
    return (this.items[id] = data);
  }

  get(id: EntityID): T | null {
    return this.items[id] ?? null;
  }

  all(): T[] {
    return Object.values(this.items);
  }
}

export default class Database {
  private tables: { [key: string]: Table<TableRow> } = {};
  getTable<T>(name: string): Table<T & TableRow> {
    return (
      (this.tables[name] as Table<T & TableRow>) ??
      (this.tables[name] = new Table<T & TableRow>())
    );
  }
}
