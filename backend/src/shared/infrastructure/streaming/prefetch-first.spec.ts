import { describe, expect, it } from 'vitest';

import { prefetchFirst } from './prefetch-first.js';

async function collect<T>(items: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const item of items) result.push(item);
  return result;
}

describe('prefetchFirst', () => {
  it('yields the first item and then the rest, in order', async () => {
    async function* source() {
      yield 1;
      yield 2;
      yield 3;
    }

    expect(await collect(await prefetchFirst(source()))).toEqual([1, 2, 3]);
  });

  it('works with an empty source', async () => {
    async function* source(): AsyncGenerator<number> {}

    expect(await collect(await prefetchFirst(source()))).toEqual([]);
  });

  it('rejects at once when the source fails before its first item', async () => {
    const source: AsyncIterable<number> = {
      [Symbol.asyncIterator]: () => ({
        next: () => Promise.reject(new Error('database down')),
      }),
    };

    await expect(prefetchFirst(source)).rejects.toThrow('database down');
  });

  it('stops the source when the consumer stops early', async () => {
    let closed = false;
    async function* source() {
      try {
        for (let i = 0; ; i++) yield i;
      } finally {
        closed = true;
      }
    }

    for await (const item of await prefetchFirst(source())) {
      if (item === 2) break;
    }

    expect(closed).toBe(true);
  });
});
