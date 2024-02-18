export const jsonStringify = (data: object) => {
  return JSON.stringify(data, (key, value) => {
    key;
    if (key && typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value;
  });
};
