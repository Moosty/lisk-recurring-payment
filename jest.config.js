
module.exports = {
  collectCoverage: true,
  reporters: [
    "default",
    ["jest-junit", {outputDirectory: "./coverage/"}],
  ],
  setupFilesAfterEnv: ['<rootDir>/test/_setup.ts'],
  coverageReporters: [
    'text',
    'html',
    'lcov',
    'cobertura',
  ],
  preset: 'ts-jest',
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    '<rootDir>/test/helpers/',
    '<rootDir>/test/fixtures/'
  ]
};
