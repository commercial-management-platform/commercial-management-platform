import { describe, expect, it } from 'vitest';
import { EMAIL_MAX_LENGTH, isValidEmail } from './email.js';

describe('isValidEmail', () => {
  it.each([
    'ventas@andina.co',
    'compras.norte@grupo-horizonte.com.co',
    'nombre+etiqueta@mail.example.org',
  ])('accepts %s', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    ['without @', 'ventas.andina.co'],
    ['without a dot in the domain', 'ventas@andina'],
    ['with spaces', 'ventas @andina.co'],
    ['with two @', 'ventas@@andina.co'],
    ['with an empty domain label', 'ventas@andina..co'],
    ['with a domain starting with a dot', 'ventas@.andina.co'],
    ['empty', ''],
  ])('rejects an address %s', (_case, email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it(`rejects addresses longer than ${EMAIL_MAX_LENGTH} characters`, () => {
    const local = 'a'.repeat(EMAIL_MAX_LENGTH);
    expect(isValidEmail(`${local}@andina.co`)).toBe(false);
  });

  it('answers in linear time on long hostile input', () => {
    // Inputs that made the previous pattern backtrack for seconds.
    const inputs = [`a@${'.'.repeat(100_000)} `, `a@${'a'.repeat(100_000)}@`];
    const start = performance.now();
    for (const input of inputs) expect(isValidEmail(input)).toBe(false);
    expect(performance.now() - start).toBeLessThan(50);
  });
});
