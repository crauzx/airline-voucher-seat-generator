import { config } from './config';
import { createConnection } from './db/connection';
import { migrate } from './db/migrate';
import { buildApp } from './app';

const db = createConnection(config.dbPath);
migrate(db);

const app = buildApp(db);

app.listen(config.port, () => {
  const originSummary =
    config.corsOrigins.length > 0 ? config.corsOrigins.join(', ') : 'disabled (same-origin only)';
  console.log(`Voucher API listening on port ${config.port}`);
  console.log(`CORS origins: ${originSummary}`);
});
