import { FieldsMap, hasRequiredFields } from '../utils/fields';
import DatabaseModel, { ModelId, ModelErrorFields } from './abstract';

export interface UserObject {
  name: string;
  password: string;
}

export default class User implements DatabaseModel {
  readonly id: ModelId;
  readonly name: string;
  protected password: string;

  constructor(data: UserObject & { id: ModelId }) {
    checkUserData(data);
    this.id = data.id;
    this.name = data.name;
    this.password = data.password;
  }

  checkPassword(password: string | undefined) {
    return this.password === password;
  }
}

const requiredFields: FieldsMap = {
  id: {
    required: true,
  },
  name: {
    required: true,
    type: 'string',
  },
  password: {
    required: true,
    type: 'string',
  },
};

export const checkUserData = (obj: object): obj is User => {
  if (hasRequiredFields<User>(obj, requiredFields)) {
    throw new ModelErrorFields();
  }
  return true;
};
