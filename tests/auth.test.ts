import { describe, expect, it } from 'vitest';
import { hashPassword, isUserAccessActive, verifyPassword } from '../server/auth.ts';

describe('senhas', () => {
  it('aceita a senha correta e recusa a errada', () => {
    const { hash, salt } = hashPassword('senha-forte-123');
    expect(verifyPassword('senha-forte-123', hash, salt)).toBe(true);
    expect(verifyPassword('senha-errada', hash, salt)).toBe(false);
  });

  it('usa um salt diferente a cada cadastro, então o hash nunca se repete', () => {
    const a = hashPassword('mesma-senha');
    const b = hashPassword('mesma-senha');
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it('não guarda a senha em texto puro', () => {
    const { hash } = hashPassword('senha-forte-123');
    expect(hash).not.toContain('senha-forte-123');
    expect(hash).toMatch(/^[0-9a-f]{128}$/);
  });

  it('recusa hash com tamanho inválido sem lançar erro', () => {
    const { salt } = hashPassword('x');
    expect(verifyPassword('x', 'abcd', salt)).toBe(false);
  });
});

describe('status de acesso da conta', () => {
  it('só considera ativa uma conta liberada', () => {
    expect(isUserAccessActive('ativo', '')).toBe(true);
    expect(isUserAccessActive('liberado', '')).toBe(true);
    expect(isUserAccessActive('pendente', '')).toBe(false);
    expect(isUserAccessActive('bloqueado', '')).toBe(false);
    expect(isUserAccessActive(null, '')).toBe(false);
  });

  it('bloqueia o acesso quando o contrato com a escola já venceu', () => {
    expect(isUserAccessActive('ativo', '2000-01-01')).toBe(false);
    expect(isUserAccessActive('ativo', '2999-12-31')).toBe(true);
  });
});
