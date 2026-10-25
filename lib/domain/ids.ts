export function createIds(prefix = "id"): () => string {
  let n = 0;
  return () => {
    n += 1;
    return `${prefix}_${n.toString(36)}`;
  };
}

export function randomId(): string {
  return crypto.randomUUID();
}
