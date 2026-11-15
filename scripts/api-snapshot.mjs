// Fetches the backend OpenAPI document and saves it as openapi/v1.json (pretty-printed, keys sorted).
// URL: first argument, else OPENAPI_URL, else the local development backend.
import { mkdir, writeFile } from 'node:fs/promises';

const url = process.argv[2] ?? process.env.OPENAPI_URL ?? 'http://localhost:49686/openapi/v1.json';

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys(value[key])]),
    );
  }
  return value;
}

const response = await fetch(url);
if (!response.ok) {
  throw new Error(`GET ${url} answered ${response.status}`);
}
const document = sortKeys(await response.json());
await mkdir('openapi', { recursive: true });
await writeFile('openapi/v1.json', JSON.stringify(document, null, 2) + '\n');
console.log(`Saved openapi/v1.json from ${url}`);
