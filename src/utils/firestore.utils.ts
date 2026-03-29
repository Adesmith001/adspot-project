const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (Object.prototype.toString.call(value) !== "[object Object]") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

export const stripUndefinedDeep = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => stripUndefinedDeep(entry))
      .filter((entry) => entry !== undefined) as T;
  }

  if (isPlainObject(value)) {
    const cleaned = Object.entries(value).reduce<Record<string, unknown>>(
      (acc, [key, entry]) => {
        if (entry === undefined) {
          return acc;
        }

        acc[key] = stripUndefinedDeep(entry);
        return acc;
      },
      {}
    );

    return cleaned as T;
  }

  return value;
};
