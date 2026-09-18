const fs = require('fs');

let content = fs.readFileSync('src/services/genealogyService.ts', 'utf8');

const injection = `
  // 5. Enriquecimento de father_label baseado nas edges conectadas
  for (const edge of edges) {
    if (edge.type === 'father_of') {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      
      if (sourceNode && targetNode && targetNode.data) {
        targetNode.data.father_label = sourceNode.label;
      }
    }
  }

  return { nodes, edges };
`;

// Substituir a linha de retorno pelo bloco com o loop
content = content.replace(/return\s*\{\s*nodes,\s*edges\s*\}\s*;/m, injection);

fs.writeFileSync('src/services/genealogyService.ts', content);