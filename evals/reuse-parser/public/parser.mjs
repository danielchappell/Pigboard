// Shared by the command-line importer and library clients.
export function parseRows(text) {
  const rows = [], row = [];
  let value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (ch === ',' || ch === '\n')) {
      row.push(value); value = '';
      if (ch === '\n') rows.push(row.splice(0));
    } else value += ch;
  }
  if (quoted) throw new Error('Unclosed quoted value');
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}
