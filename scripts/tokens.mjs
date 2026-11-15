// Generates src/styles/tokens.css and src/styles/theme.css from design-system/tokens.json.
import { writeFile } from 'node:fs/promises';
import { buildTokens } from './tokens-build.mjs';

const { tokensCss, themeCss } = await buildTokens();
await writeFile('src/styles/tokens.css', tokensCss);
await writeFile('src/styles/theme.css', themeCss);
console.log('Generated src/styles/tokens.css and src/styles/theme.css');
