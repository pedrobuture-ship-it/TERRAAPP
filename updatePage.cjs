const fs = require('fs');
let content = fs.readFileSync('src/pages/GenealogyPage.tsx', 'utf8');

// 1. Add translation map
const translationMap = `
const statusMap: Record<string, string> = {
  empty: 'Vazia',
  inseminated: 'Inseminada',
  pregnant: 'Prenhe',
  calved: 'Parida',
  discarded: 'Descartada',
};
`;
content = content.replace("// Custom Nodes", translationMap + "\n// Custom Nodes");

// 2. Modify MatrixNode to include translated status and father label
let matrixNodeOld = `{data.reproductive_status && (
        <div className="mt-2 inline-block rounded bg-green-900/50 px-2 py-0.5 text-xs font-semibold">
          {data.reproductive_status}
        </div>
      )}`;
let matrixNodeNew = `{data.reproductive_status && (
        <div className="mt-2 inline-block rounded bg-green-900/50 px-2 py-0.5 text-xs font-semibold">
          {statusMap[String(data.reproductive_status)] || data.reproductive_status}
        </div>
      )}
      <div className="mt-1 text-[10px] text-green-200 truncate" title={"Pai: " + (data.father_label || 'Desconhecido')}>
        Pai: {data.father_label || 'Desconhecido'}
      </div>`;
content = content.replace(matrixNodeOld, matrixNodeNew);

// 3. Modify OffspringNode to include father label
let offspringNodeOld = `</div>
    </div>
  );`;
let offspringNodeNew = `</div>
      <div className="mt-1 text-[10px] text-slate-300 truncate" title={"Pai: " + (data.father_label || 'Desconhecido')}>
        Pai: {data.father_label || 'Desconhecido'}
      </div>
    </div>
  );`;
content = content.replace(offspringNodeOld, offspringNodeNew);

// 4. Also translate status in the side panel
content = content.replace(
  "{(selectedNode.data.reproductive_status as string) || '-'}",
  "{statusMap[selectedNode.data.reproductive_status as string] || (selectedNode.data.reproductive_status as string) || '-'}"
);

fs.writeFileSync('src/pages/GenealogyPage.tsx', content);