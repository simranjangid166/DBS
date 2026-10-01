const app = require("./app");
const env = require("./config/env");
const { init: initDb } = require("./database/init");

async function main() {
  console.log("[boot] Initializing MySQL database...");
  await initDb();
  app.listen(env.port, "127.0.0.1", () => {
    console.log(`[boot] Blood Bank API listening on http://127.0.0.1:${env.port}`);
  });
}

main().catch((err) => {
  console.error("[boot] Fatal:", err);
  process.exit(1);
});
