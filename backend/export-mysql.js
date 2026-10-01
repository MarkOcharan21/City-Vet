const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function exportMysql() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pet_vet_system',
  });

  const [tables] = await connection.query('SHOW TABLES');
  const tableNames = tables.map(t => Object.values(t)[0]);

  const schema = {};
  const data = {};

  for (const tableName of tableNames) {
    console.log(`Exporting ${tableName}...`);
    
    const [columns] = await connection.query(`DESCRIBE \`${tableName}\``);
    schema[tableName] = columns;

    const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
    data[tableName] = rows;
  }

  await connection.end();

  const exportData = { schema, data };
  fs.writeFileSync('mysql_export.json', JSON.stringify(exportData, null, 2));
  console.log('Export complete: mysql_export.json');
}

exportMysql().catch(console.error);