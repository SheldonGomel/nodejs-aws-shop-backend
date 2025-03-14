module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+.tsx?$': ['ts-jest', { isolatedModules: true }]
  },
  roots: ['<rootDir>/import_service', '<rootDir>/product_service'],
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/cdk.out/'],
};
