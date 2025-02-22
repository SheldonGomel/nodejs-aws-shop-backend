module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test','<rootDir>/product_service'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
