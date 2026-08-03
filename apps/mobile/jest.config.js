/**
 * Dois projects, porque as duas camadas precisam de runtimes diferentes:
 *
 * - `logic`: serviços de domínio, fila de sync e cálculos, em Node com ts-jest.
 *   Configuração idêntica à que existia antes — os testes de lógica não mudam.
 * - `components`: telas e componentes com jest-expo + RNTL. Nasceu junto da
 *   correção do sumiço de imagens: resiliência de sprite é comportamento de
 *   componente, e sem renderizar não há como verificar que a correção funciona.
 *
 * `pnpm test:mobile` roda os dois.
 */
const moduleNameMapper = {
  '^@ad-sidera/config$': '<rootDir>/../../packages/config/src/index.ts',
  '^@/(.*)$': '<rootDir>/src/$1',
  '\\.(png|jpg|jpeg|gif|webp)$': '<rootDir>/jest.assetStub.js',
};

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'logic',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/src'],
      testMatch: ['**/*.test.ts'],
      moduleNameMapper,
      transform: {
        '^.+\\.ts$': [
          'ts-jest',
          { isolatedModules: true, tsconfig: { esModuleInterop: true, strict: true } },
        ],
      },
    },
    {
      displayName: 'components',
      preset: 'jest-expo',
      roots: ['<rootDir>/src', '<rootDir>/app'],
      testMatch: ['**/*.test.tsx'],
      moduleNameMapper,
    },
  ],
};
