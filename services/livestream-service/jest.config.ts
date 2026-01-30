import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      useESM: false,
      tsconfig: 'tsconfig.spec.json',
    }],
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>', '<rootDir>/../'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
    '(\\.{1,2}/.*)\\.js$': '$1',
    '@prisma/client': '<rootDir>/../__mocks__/prisma-client.ts',
  },
  setupFiles: ['<rootDir>/../jest.setup.ts'],
};

export default config;
