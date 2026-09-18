const fs = require('fs');
let s = fs.readFileSync('src/db/db.ts', 'utf8');

// replace version(1) closing brace to append version(2)
const v2Code = `    });

    this.version(2).stores({
      inseminations: '&id, animal_id, semen_id, bull_id, remote_id, farm_id, sync_status, date, updated_at, deleted_at',
    });`;

s = s.replace(/    \}\);\n  \}/, v2Code + '\n  }');

fs.writeFileSync('src/db/db.ts', s);