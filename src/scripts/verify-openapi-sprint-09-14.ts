import * as fs from 'fs';

interface OpenApiSpec {
  paths?: Record<string, unknown>;
}

const REQUIRED_PATHS = [
  '/boards',
  '/requests/similar',
  '/requests/{id}/comments',
  '/roadmap/items',
  '/roadmap/views',
  '/integrations/fireflies/config',
  '/integrations/fireflies/import-transcript',
  '/ai/requests/match-similar',
  '/users',
  '/users/{id}/role',
  '/audit/events',
  '/releases/{id}',
  '/analytics/adoption',
  '/health/events',
  '/integrations/linear/status-mapping',
  '/integrations/logs',
  '/integrations/logs/{logId}/retry',
] as const;

function main(): void {
  if (!fs.existsSync('./openapi.json')) {
    console.error('openapi.json not found. Run openapi:generate first.');
    process.exit(1);
  }

  const raw = fs.readFileSync('./openapi.json', 'utf8');
  const spec = JSON.parse(raw) as OpenApiSpec;
  const paths = spec.paths ?? {};

  const missing = REQUIRED_PATHS.filter((path) => !(path in paths));

  if (missing.length > 0) {
    console.error('Missing required sprint 09-14 paths in openapi.json:');
    for (const path of missing) {
      console.error(`- ${path}`);
    }
    process.exit(1);
  }

  console.log(
    `OpenAPI verification passed: ${REQUIRED_PATHS.length} required sprint 09-14 paths are present.`,
  );
}

main();
