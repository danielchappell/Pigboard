import { readFile } from 'node:fs/promises';
import { parseRows } from './parser.mjs';

// Usage: node cli.mjs INPUT_FILE
console.log(JSON.stringify(parseRows(await readFile(process.argv[2], 'utf8'))));
