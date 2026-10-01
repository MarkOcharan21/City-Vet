const fs = require('fs');

const exportData = JSON.parse(fs.readFileSync('mysql_export.json', 'utf8'));
const schema = exportData.schema;
const data = exportData.data;

function mysqlToPgType(mysqlType) {
  const type = mysqlType.toLowerCase();
  if (type.includes('int')) return 'INTEGER';
  if (type.includes('bigint')) return 'BIGINT';
  if (type.includes('tinyint(1)') || type.includes('boolean')) return 'BOOLEAN';
  if (type.includes('decimal') || type.includes('float') || type.includes('double')) return 'DECIMAL';
  if (type.includes('varchar') || type.includes('char') || type.includes('text') || type.includes('enum')) return 'TEXT';
  if (type.includes('datetime') || type.includes('timestamp')) return 'TIMESTAMPTZ';
  if (type.includes('date')) return 'DATE';
  if (type.includes('time')) return 'TIME';
  if (type.includes('json')) return 'JSONB';
  if (type.includes('blob') || type.includes('binary')) return 'BYTEA';
  return 'TEXT';
}

function escapeValue(val, pgType) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  let str = String(val).replace(/'/g, "''");
  if (pgType === 'DATE' || pgType === 'TIME' || pgType === 'TIMESTAMPTZ') {
    return `'${str}'`;
  }
  return `'${str}'`;
}

let sql = '-- Migration from MySQL to PostgreSQL (Supabase)\n';
sql += '-- Generated on ' + new Date().toISOString() + '\n\n';
sql += 'SET session_replication_role = replica;\n\n';

const tableNames = Object.keys(schema).sort();

for (const tableName of tableNames) {
  const columns = schema[tableName];
  const cols = [];
  const pks = [];
  
  for (const col of columns) {
    const pgType = mysqlToPgType(col.Type);
    let def = `"${col.Field}" ${pgType}`;
    
    if (col.Null === 'NO') def += ' NOT NULL';
    if (col.Default !== null && col.Default !== undefined) {
      let d = col.Default;
      if (d === 'current_timestamp()' || d === 'CURRENT_TIMESTAMP') d = 'CURRENT_TIMESTAMP';
      else if (typeof d === 'string' && !d.match(/^[0-9]/)) d = `'${d.replace(/'/g, "''")}'`;
      def += ` DEFAULT ${d}`;
    }
    if (col.Extra === 'auto_increment') {
      def = `"${col.Field}" BIGSERIAL`;
    }
    if (col.Key === 'PRI') pks.push(col.Field);
    
    cols.push(def);
  }
  
  if (pks.length > 0) {
    cols.push(`PRIMARY KEY (${pks.map(p => `"${p}"`).join(', ')})`);
  }
  
  sql += `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${cols.join(',\n  ')}\n);\n\n`;
}

for (const tableName of tableNames) {
  const rows = data[tableName];
  if (!rows || rows.length === 0) continue;
  
  const columns = schema[tableName].map(c => c.Field);
  const colTypes = {};
  columns.forEach(c => {
    const colDef = schema[tableName].find(cd => cd.Field === c);
    colTypes[c] = mysqlToPgType(colDef.Type);
  });
  
  sql += `-- Data for ${tableName} (${rows.length} rows)\n`;
  
  for (const row of rows) {
    const colNames = columns.map(c => `"${c}"`).join(', ');
    const values = columns.map(c => escapeValue(row[c], colTypes[c])).join(', ');
    sql += `INSERT INTO "${tableName}" (${colNames}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`;
  }
  sql += '\n';
}

sql += 'SET session_replication_role = DEFAULT;\n';

fs.writeFileSync('supabase_migration.sql', sql);
console.log('SQL file created: supabase_migration.sql');
console.log('Size:', (sql.length / 1024 / 1024).toFixed(2), 'MB');