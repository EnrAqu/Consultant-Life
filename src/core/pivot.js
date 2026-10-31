export function resolveMode(entity, pivotCause) {
  if (!entity.slot) return entity.mode ?? 'normal';
  return entity.type === pivotCause ? 'pivoted' : 'normal';
}

// Returns a level definition with slot modes resolved and tile overrides applied.
export function resolveLevel(def, pivotCause = null) {
  const rows = def.map.map((row) => row.split(''));
  const entities = def.entities.map((e) => {
    const mode = resolveMode(e, pivotCause);
    const params = e.slot ? e.params?.[mode] ?? {} : e.params ?? {};
    for (const t of params.tiles ?? []) {
      for (let y = 0; y < t.h; y++) {
        for (let x = 0; x < t.w; x++) {
          const row = rows[e.y + t.dy + y];
          if (row && e.x + t.dx + x < row.length) row[e.x + t.dx + x] = t.char;
        }
      }
    }
    return { ...e, mode, params };
  });
  return { ...def, map: rows.map((r) => r.join('')), entities };
}
