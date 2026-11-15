// Generates src/app/core/api/generated/api-types.ts from the committed snapshot openapi/v1.json.
// The backend accepts numbers written as strings on input, so its document declares every integer
// and decimal as `["integer" | "number", "string"]` (plus `"null"` when nullable); the API always
// returns JSON numbers, so such schemas are generated as `number` (`number | null` when nullable).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
import openapiTS, { astToString } from 'openapi-typescript';

const NUMBER = ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);

function isNumericOrString(schema) {
  const type = schema.type;
  return (
    Array.isArray(type) &&
    type.includes('string') &&
    (type.includes('integer') || type.includes('number')) &&
    type.every((t) => ['integer', 'number', 'string', 'null'].includes(t))
  );
}

const source = JSON.parse(await readFile('openapi/v1.json', 'utf8'));
const ast = await openapiTS(source, {
  transform(schemaObject) {
    if (isNumericOrString(schemaObject)) {
      return schemaObject.type.includes('null')
        ? ts.factory.createUnionTypeNode([
            NUMBER,
            ts.factory.createLiteralTypeNode(ts.factory.createNull()),
          ])
        : NUMBER;
    }
    return undefined;
  },
});
await mkdir('src/app/core/api/generated', { recursive: true });
await writeFile('src/app/core/api/generated/api-types.ts', astToString(ast));
console.log('Generated src/app/core/api/generated/api-types.ts');
