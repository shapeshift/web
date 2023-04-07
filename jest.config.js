module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '.d.ts', '.js', '__mocks__', 'mockData'],
  clearMocks: true,
  roots: ['<rootDir>'],
  collectCoverage: true,
  setupFiles: ['<rootDir>/.jest/setup.js'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', 'dist', '__mocks__', 'mockData'],
  moduleNameMapper: {
    '^@shapeshiftoss\\/([^/]+)': ['@shapeshiftoss/$1/src', '@shapeshiftoss/$1'],
  },
  globals: {
    'ts-jest': {
      sourceMap: true,
      isolatedModules: true,
    },
  },
}
