const fs = require('fs');

const inputFile = 'supabase_migration.sql';
const outputDir = 'migration_chunks';
const maxSizeKB = 500; // 500KB per chunk

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.split('\n');

let currentChunk = '';
let chunkNum = 1;
let inDataSection = false;
let currentTable = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i] + '\n';
  
  // Detect table data sections
  if (line.startsWith('-- Data for ')) {
    inDataSection = true;
    currentTable = line.match(/-- Data for (\w+)/)[1];
  }
  
  currentChunk += line;
  
  // Check if we should split (after CREATE TABLE statements or large data sections)
  const chunkSizeKB = Buffer.byteLength(currentChunk, 'utf8') / 1024;
  
  if (chunkSizeKB >= maxSizeKB) {
    // Try to split at a good boundary
    let splitIndex = currentChunk.lastIndexOf(';\n');
    if (splitIndex === -1) splitIndex = currentChunk.lastIndexOf('\n');
    
    if (splitIndex > 0) {
      const toWrite = currentChunk.substring(0, splitIndex + 1);
      currentChunk = currentChunk.substring(splitIndex + 1);
      
      fs.writeFileSync(`${outputDir}/chunk_${String(chunkNum).padStart(3, '0')}.sql`, toWrite);
      console.log(`Created chunk_${String(chunkNum).padStart(3, '0')}.sql (${(Buffer.byteLength(toWrite, 'utf8') / 1024).toFixed(1)} KB)`);
      chunkNum++;
    }
  }
}

// Write remaining
if (currentChunk.trim()) {
  fs.writeFileSync(`${outputDir}/chunk_${String(chunkNum).padStart(3, '0')}.sql`, currentChunk);
  console.log(`Created chunk_${String(chunkNum).padStart(3, '0')}.sql (${(Buffer.byteLength(currentChunk, 'utf8') / 1024).toFixed(1)} KB)`);
}

console.log(`\nDone! ${chunkNum} chunks created in ${outputDir}/`);
console.log('Run them in order: chunk_001.sql, chunk_002.sql, ...');