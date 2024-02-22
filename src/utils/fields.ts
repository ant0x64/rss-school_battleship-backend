export type FieldsMap = {
  [key: string | '*']: {
    required: boolean;
    type?: 'array' | 'number' | 'string' | 'object';
    child?: FieldsMap;
  };
};

const hasKey = (key: string, object: object): key is keyof typeof object => {
  return key in object;
};

export const hasRequiredFields = <T>(
  obj: unknown,
  requiredFields: FieldsMap,
): obj is T => {
  if (obj === null || typeof obj !== 'object') {
    return true;
  }
  for (const key of Object.keys(requiredFields)) {
    const params = requiredFields[key];
    const objectItem = hasKey(key, obj) ? (obj[key] as unknown) : undefined;
    if (!params) {
      continue;
    }
    if (objectItem !== undefined) {
      switch (params.type) {
        case 'string':
          if (
            !(typeof objectItem === 'string') ||
            (params.required && !objectItem.length)
          ) {
            return true;
          }
          break;
        case 'object':
          if (!(typeof objectItem === 'object')) {
            return true;
          } else if (params.child) {
            if (hasRequiredFields(objectItem, params.child)) {
              return true;
            }
          }
          break;
        case 'array':
          if (!(objectItem instanceof Array)) {
            return true;
          } else if (params.required && !objectItem.length) {
            return true;
          } else if (params.child && objectItem.length) {
            const arrayObject: { [key: number]: unknown } = {};
            const childForAll = params.child['*'];

            objectItem.map((el, key) => {
              arrayObject[key] = el;
            });

            if (childForAll) {
              const map: FieldsMap = {};
              objectItem.map(({}, key) => {
                map[key] = childForAll;
              });
              if (hasRequiredFields(arrayObject, map)) {
                return true;
              }
            } else {
              if (hasRequiredFields(arrayObject, params.child)) {
                return true;
              }
            }
          }
          break;
        case 'number':
          if (!(typeof objectItem === 'number')) {
            return true;
          }
          break;
      }
    } else if (params.required) {
      return true;
    }
  }
  return false;
};
