/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['testing/unit/**/*.test.js', 'testing/integration/**/*.test.js'],
    reporters: ['verbose'],
    outputFile: 'testing/logs/unit.log',
  },
});
