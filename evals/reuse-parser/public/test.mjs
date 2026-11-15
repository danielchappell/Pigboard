import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRows } from './parser.mjs';

test('existing callers retain comma parsing, quotes and empty input', () => {
  assert.deepEqual(parseRows('name,value\n"a,b",2\n'), [['name', 'value'], ['a,b', '2']]);
  assert.deepEqual(parseRows(''), []);
  assert.throws(() => parseRows('"unfinished'), /Unclosed/);
});
