/**
 * A Result is either a success carrying a value, or a failure carrying an error.
 * The engine returns Results instead of throwing, so callers must handle both cases.
 *
 *   const r = parseCard('3♠');
 *   if (r.ok) { use(r.value); } else { show(r.error); }
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Wrap a success value. */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/** Wrap an error value. */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}