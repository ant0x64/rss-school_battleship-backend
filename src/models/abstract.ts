import { TableRow } from './../services/db.service';

export type ModelId = TableRow['id'];

export default interface DatabaseModel extends TableRow {}

export class ModelErrorFields extends Error {
  constructor(
    message: string = 'Does not contain mandatory fields or has an invalid type',
  ) {
    super(message);
  }
}
