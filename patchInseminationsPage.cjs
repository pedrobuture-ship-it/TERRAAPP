const fs = require('fs');
let s = fs.readFileSync('src/pages/InseminationsPage.tsx', 'utf8');

// replace the hasActive condition
s = s.replace(/const hasActive = inseminations\.some\(\(ins\) => [\s\S]*?\);/, (match) => {
  // We'll construct new condition using cycle_status
  const newCond = `const hasActive = inseminations.some((ins) => 
        ins.animal_id === form.animal_id &&
        ins.cycle_status === 'active' &&
        (!editingInsemination || ins.id !== editingInsemination.id)
      );`;
  return newCond;
});

fs.writeFileSync('src/pages/InseminationsPage.tsx', s);