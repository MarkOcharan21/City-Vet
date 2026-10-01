const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const exportData = JSON.parse(fs.readFileSync('mysql_export.json', 'utf8'));
const schema = exportData.schema;
const data = exportData.data;

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: 10,
  connectionTimeoutMillis: 30000,
  family: 4,
});

function mysqlToPgType(mysqlType, field) {
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

function buildCreateTable(tableName, columns) {
  const cols = [];
  const pks = [];
  
  for (const col of columns) {
    const pgType = mysqlToPgType(col.Type, col);
    let def = `"${col.Field}" ${pgType}`;
    
    if (col.Null === 'NO') def += ' NOT NULL';
    if (col.Default !== null && col.Default !== undefined) {
      let d = col.Default;
      if (d === 'current_timestamp()' || d === 'CURRENT_TIMESTAMP') d = 'CURRENT_TIMESTAMP';
      else if (typeof d === 'string' && !d.match(/^[0-9]/)) d = `'${d.replace(/'/g, "''")}'`;
      def += ` DEFAULT ${d}`;
    }
    if (col.Extra === 'auto_increment') {
      def = `"${col.Field}" SERIAL`;
    }
    if (col.Key === 'PRI') pks.push(col.Field);
    
    cols.push(def);
  }
  
  if (pks.length > 0) {
    cols.push(`PRIMARY KEY (${pks.map(p => `"${p}"`).join(', ')})`);
  }
  
  return `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${cols.join(',\n  ')}\n);`;
}

async function migrate() {
  const client = await pgPool.connect();
  
  try {
    await client.query('BEGIN');
    
    const tableNames = Object.keys(schema).sort();
    
    for (const tableName of tableNames) {
      const columns = schema[tableName];
      const sql = buildCreateTable(tableName, columns);
      
      console.log(`Creating table: ${tableName}`);
      await client.query(sql);
    }
    
    await client.query('COMMIT');
    console.log('All tables created');
    
    // Insert data
    for (const tableName of tableNames) {
      const rows = data[tableName];
      if (!rows || rows.length === 0) continue;
      
      const columns = schema[tableName].map(c => c.Field);
      const colNames = columns.map(c => `"${c}"`).join(', ');
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      
      const insertSql = `INSERT INTO "${tableName}" (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
      
      console.log(`Inserting ${rows.length} rows into ${tableName}...`);
      
      for (const row of rows) {
        const values = columns.map(c => {
          let v = row[c];
          if (v === undefined) return null;
          if (typeof v === 'boolean') return v;
          if (v === null) return null;
          if (typeof v === 'object') return JSON.stringify(v);
          return v;
        });
        
        try {
          await client.query(insertSql, values);
        } catch (e) {
          console.error(`Error inserting into ${tableName}:`, e.message);
        }
      }
    }
    
    console.log('Migration complete!');
    
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e);
  } finally {
    client.release();
    await pgPool.end();
  }
}

migrate();