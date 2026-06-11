export function softDeleteCondition(
  includeDeleted = false,
): Record<string, unknown> {
  return includeDeleted ? {} : { deletedAt: null };
}

export function softDeleteQuery(
  includeDeleted = false,
): Record<string, unknown> {
  return includeDeleted ? {} : { deletedAt: null };
}
