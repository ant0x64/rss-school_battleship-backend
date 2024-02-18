import { UUID, randomUUID } from 'node:crypto';

export interface TableRow {
  id: UUID;
  [key: string | number]: any;
}

class Table<T extends TableRow> {
  #items: { [key: UUID]: T } = {};

  public add(data: T): T {
    const id = randomUUID();
    data.id = id;
    return (this.#items[id] = data as T);
  }

  public delete(id: UUID): boolean {
    return delete this.#items[id];
  }

  public update(id: UUID, data: T): T {
    const item = this.get(id);
    data = { ...(item ?? {}), ...data } as T;
    return (this.#items[id] = data);
  }

  public get(id: UUID): T | null {
    return this.#items[id] ?? null;
  }

  public all(): T[] {
    return Object.values(this.#items);
  }
}

export default class Database {
  private tables: { [key: string]: Table<TableRow> } = {};
  getTable(name: string) {
    return this.tables[name] ?? (this.tables[name] = new Table());
  }
}
