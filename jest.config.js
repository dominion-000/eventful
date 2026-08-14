/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  setupFiles: ["<rootDir>/tests/setup.ts"],
  clearMocks: true,
  testTimeout: 45000,

  // These tests use the same real MongoDB/Redis infrastructure.
  // Run suites serially to avoid cross-test cache/database interference.
  maxWorkers: 1,
};
