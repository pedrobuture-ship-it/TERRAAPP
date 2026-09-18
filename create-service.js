const fs = require('fs');
const content = import { db } from '../db';
import type { Animal, Semen } from '../types';

export interface PedigreeNode {
  id: string;
  name: string;
  breed?: string;
  type: 'animal' | 'semen' | 'unknown';
}

export interface FamilyTree {
  animal: PedigreeNode;
  father?: PedigreeNode;
  mother?: PedigreeNode;
  paternalGrandfather?: PedigreeNode;
  paternalGrandmother?: PedigreeNode;
  maternalGrandfather?: PedigreeNode;
  maternalGrandmother?: PedigreeNode;
}

export interface CrossSimulationResult {
  score: number;
  inbreedingLevel: 'none' | 'distant' | 'high' | 'critical';
  inbreedingMessage: string;
  heterosisLevel: 'none' | 'maintenance' | 'industrial';
  heterosisMessage: string;
}

export async function getGenealogyData(farmId: string) {
  const animals = await db.animals.where('farm_id').equals(farmId).filter(a => !a.deleted_at).toArray();
  const semenList = await db.semen.where('farm_id').equals(farmId).filter(s => !s.deleted_at).toArray();
  return { animals, semenList };
}

function resolveParent(parentId: string | undefined, animals: Animal[], semenList: Semen[]): PedigreeNode | undefined {
  if (!parentId) return undefined;
  const animal = animals.find(a => a.id === parentId);
  if (animal) return { id: animal.id, name: animal.name || animal.identification || 'Desconhecido', breed: animal.breed, type: 'animal' };
  const semen = semenList.find(s => s.id === parentId);
  if (semen) return { id: semen.id, name: semen.bull_name + (semen.code ? ' (' + semen.code + ')' : ''), breed: semen.breed, type: 'semen' };
  return { id: parentId, name: 'Desconhecido', type: 'unknown' };
}

export function buildFamilyTree(animalId: string, animals: Animal[], semenList: Semen[]): FamilyTree | null {
  const animal = animals.find(a => a.id === animalId);
  if (!animal) return null;
  const base: PedigreeNode = { id: animal.id, name: animal.name || animal.identification || 'Desconhecido', breed: animal.breed, type: 'animal' };
  const father = resolveParent(animal.father_id, animals, semenList);
  const mother = resolveParent(animal.mother_id, animals, semenList);
  let paternalGrandfather, paternalGrandmother, maternalGrandfather, maternalGrandmother;
  if (father && father.type === 'animal') {
    const fA = animals.find(a => a.id === father.id);
    if (fA) { paternalGrandfather = resolveParent(fA.father_id, animals, semenList); paternalGrandmother = resolveParent(fA.mother_id, animals, semenList); }
  }
  if (mother && mother.type === 'animal') {
    const mA = animals.find(a => a.id === mother.id);
    if (mA) { maternalGrandfather = resolveParent(mA.father_id, animals, semenList); maternalGrandmother = resolveParent(mA.mother_id, animals, semenList); }
  }
  return { animal: base, father, mother, paternalGrandfather, paternalGrandmother, maternalGrandfather, maternalGrandmother };
}

function getAncestors(animalId: string, animals: Animal[], depth: number, currentDepth = 0): string[] {
  if (currentDepth >= depth || !animalId) return [];
  const animal = animals.find((a) => a.id === animalId);
  if (!animal) return [];
  const ancestors: string[] = [];
  if (animal.father_id) { ancestors.push(animal.father_id); ancestors.push(...getAncestors(animal.father_id, animals, depth, currentDepth + 1)); }
  if (animal.mother_id) { ancestors.push(animal.mother_id); ancestors.push(...getAncestors(animal.mother_id, animals, depth, currentDepth + 1)); }
  return [...new Set(ancestors)];
}

export function simulateCross(femaleId: string, maleId: string, animals: Animal[], semenList: Semen[]): CrossSimulationResult {
  const female = animals.find(a => a.id === femaleId);
  const maleAnimal = animals.find(a => a.id === maleId);
  const maleSemen = semenList.find(s => s.id === maleId);
  let score = 10;
  let inbreedingLevel: CrossSimulationResult['inbreedingLevel'] = 'none';
  let inbreedingMessage = 'Sem parentesco proximo. Cruzamento seguro.';
  let heterosisLevel: CrossSimulationResult['heterosisLevel'] = 'none';
  let heterosisMessage = 'Raca nao informada. Preencha o cadastro para uma analise melhor.';
  if (!female || (!maleAnimal && !maleSemen)) {
    return { score: 0, inbreedingLevel: 'critical', inbreedingMessage: 'Animais invalidos.', heterosisLevel: 'none', heterosisMessage: '' };
  }
  let isCritical = false;
  let isHighAlert = false;
  let isDistant = false;
  if (female.father_id === maleId) isCritical = true;
  else if (maleAnimal && maleAnimal.mother_id === femaleId) isCritical = true;
  else if (female.father_id && female.mother_id && maleAnimal && female.father_id === maleAnimal.father_id && female.mother_id === maleAnimal.mother_id) isCritical = true;
  if (!isCritical) {
    const femaleParents = [female.father_id, female.mother_id].filter(Boolean) as string[];
    const maleParents = maleAnimal ? [maleAnimal.father_id, maleAnimal.mother_id].filter(Boolean) as string[] : [];
    if (femaleParents.some(p => maleParents.includes(p))) isHighAlert = true;
    if (femaleParents.some(p => { const parent = animals.find(a => a.id === p); return parent && parent.father_id === maleId; })) isHighAlert = true;
  }
  if (!isCritical && !isHighAlert) {
    const femaleAncestors = getAncestors(female.id, animals, 4);
    const maleAncestors = maleAnimal ? getAncestors(maleAnimal.id, animals, 4) : [];
    if (femaleAncestors.some(a => maleAncestors.includes(a))) isDistant = true;
    else if (femaleAncestors.includes(maleId) || maleAncestors.includes(femaleId)) isDistant = true;
  }
  if (isCritical) { inbreedingLevel = 'critical'; inbreedingMessage = 'ALERTA CRITICO: Parentesco de 1 Grau (Risco severo de defeitos e perda de fertilidade).'; score -= 8; }
  else if (isHighAlert) { inbreedingLevel = 'high'; inbreedingMessage = 'ALERTA ALTO: Parentesco de 2 Grau (Consanguinidade de ~12.5%).'; score -= 4; }
  else if (isDistant) { inbreedingLevel = 'distant'; inbreedingMessage = 'Parentesco distante encontrado. Monitore os descendentes.'; score -= 1; }
  const femaleBreed = (female.breed || '').trim().toLowerCase();
  const maleBreed = ((maleAnimal ? maleAnimal.breed : maleSemen?.breed) || '').trim().toLowerCase();
  if (femaleBreed && maleBreed) {
    if (femaleBreed !== maleBreed) { heterosisLevel = 'industrial'; heterosisMessage = 'Cruzamento Industrial: Racas diferentes geram Vigor Hibrido (ganho de peso e rusticidade).'; }
    else { heterosisLevel = 'maintenance'; heterosisMessage = 'Manutencao de Linhagem: Mesma raca. Ideal para manter pureza (PO).'; score -= 1; }
  } else { score -= 2; }
  return { score: Math.max(0, score), inbreedingLevel, inbreedingMessage, heterosisLevel, heterosisMessage };
}
;
fs.writeFileSync('src/services/genealogyService.ts', content);

