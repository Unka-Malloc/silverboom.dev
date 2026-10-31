// @ts-check
const { defineConfig, devices } = require("@playwright/test");

const port = 8973;

module.exports = defineConfig({
  testDir: "./tests",
  reporter: "list",
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
  },
  webServer: {
    command: `python3 -m http.server ${port} --bind 127.0.0.1`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
