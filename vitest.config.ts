import GithubActionsReporter from 'vitest-github-actions-reporter'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    exclude: ['src/test.util.spec.ts'],
    reporters: process.env.GITHUB_ACTIONS ? new GithubActionsReporter() : 'default',
  },
})
