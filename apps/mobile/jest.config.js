/**
 * Testes de LÓGICA do app (serviços de domínio local, fila de sync, cálculos)
 * rodam em Node com ts-jest — sem depender do runtime nativo do RN.
 * Componentes/telas são testados com jest-expo (ver docs/TESTING.md).
 */
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@ad-sidera/config$': '<rootDir>/../../packages/config/src/index.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      { isolatedModules: true, tsconfig: { esModuleInterop: true, strict: true } },
    ],
  },
};
