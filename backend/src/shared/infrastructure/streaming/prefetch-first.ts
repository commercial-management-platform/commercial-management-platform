/**
 * Reads the first item of `source` now and returns an iterable that yields
 * it followed by the rest. A streamed response uses it to fail before its
 * headers are sent: an error opening the source (for example, the database)
 * is still a normal error response instead of a broken 200 download.
 *
 * Stopping the returned iterable early also stops `source`.
 */
export async function prefetchFirst<T>(
  source: AsyncIterable<T>,
): Promise<AsyncIterable<T>> {
  const iterator = source[Symbol.asyncIterator]();
  const first = await iterator.next();

  return {
    async *[Symbol.asyncIterator]() {
      try {
        if (first.done) return;
        yield first.value;
        for (;;) {
          const next = await iterator.next();
          if (next.done) return;
          yield next.value;
        }
      } finally {
        await iterator.return?.();
      }
    },
  };
}
