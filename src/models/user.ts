import { FieldsMap, hasRequiredFields } from '../utils/fields';
import DatabaseModel, { ModelErrorFields } from './abstract';

export default interface User extends DatabaseModel {
  name: string;
  password: string;
}

const requiredFields: FieldsMap = {
  name: {
    required: true,
    type: 'string',
  },
  password: {
    required: true,
    type: 'string',
  },
};

export const createUserModel = (obj: object | User): User => {
  if (hasRequiredFields<User>(obj, requiredFields)) {
    throw new ModelErrorFields();
  }
  return obj as User;
};
