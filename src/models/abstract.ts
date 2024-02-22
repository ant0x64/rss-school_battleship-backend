import { TableRow, EntityID, randomEntityID } from '../services/db.service';

export type ModelId = EntityID;
export const randomModelId = randomEntityID;

export default interface DatabaseModel extends TableRow {}

export class ModelErrorFields extends Error {
  constructor(
    message: string = 'Does not contain mandatory fields or has an invalid type',
  ) {
    super(message);
  }
}
