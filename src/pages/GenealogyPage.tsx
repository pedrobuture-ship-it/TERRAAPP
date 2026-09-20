import React, { useState, useEffect } from 'react';
import { PageShell } from '../components/layout/PageShell';
import { getGenealogyData, buildFamilyTree, simulateCross } from '../services/genealogyService';
import type { Animal, Semen } from '../types';
import type { FamilyTree, CrossSimulationResult } from '../services/genealogyService';
import { GitFork, Beaker, ShieldAlert, ShieldCheck, Search, Activity } from 'lucide-react';

export function GenealogyPage() {
  const [activeTab, setActiveTab] = useState<'tree' | 'simulator'>('tree');
  
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [semenList, setSemenList] = useState<Semen[]>([]);
  const [loading, setLoading] = useState(true);

  // Tree State
  const [selectedTreeAnimal, setSelectedTreeAnimal] = useState<string>('');
  const [familyTree, setFamilyTree] = useState<FamilyTree | null>(null);

  // Simulator State
  const [selectedFemale, setSelectedFemale] = useState<string>('');
  const [selectedMale, setSelectedMale] = useState<string>('');
  const [simulationResult, setSimulationResult] = useState<CrossSimulationResult | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const data = await getGenealogyData();
      setAnimals(data.animals);
      setSemenList(data.semenList);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedTreeAnimal) {
      setFamilyTree(buildFamilyTree(selectedTreeAnimal, animals, semenList));
    } else {
      setFamilyTree(null);
    }
  }, [selectedTreeAnimal, animals, semenList]);

  useEffect(() => {
    if (selectedFemale && selectedMale) {
      setSimulationResult(simulateCross(selectedFemale, selectedMale, animals, semenList));
    } else {
      setSimulationResult(null);
    }
  }, [selectedFemale, selectedMale, animals, semenList]);

  const renderTreeCard = (node: FamilyTree['animal'] | undefined, label: string) => {
    if (!node) {
      return (
        <div className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 min-h-[80px]">
          <span className="text-xs text-slate-500 uppercase font-semibold">{label}</span>
          <span className="text-sm text-slate-400 mt-1">Não informado</span>
        </div>
      );
    }
    
    return (
      <div className={`flex flex-col items-center justify-center p-3 border rounded-lg shadow-sm
        ${node.type === 'animal' ? 'bg-white border-emerald-200' : 
          node.type === 'semen' ? 'bg-blue-50 border-blue-200' : 'bg-slate-100 border-slate-200'}`}>
        <span className="text-xs text-slate-500 uppercase font-semibold">{label}</span>
        <span className="text-sm font-bold text-slate-800 mt-1 text-center">{node.name}</span>
        {node.breed && (<span className="text-xs text-slate-600 mt-0.5">{node.breed}</span>) }
      </div>
    );
  };

  return (
    <PageShell 
      title="Genealogia & Acasalamento" 
      description="Gestão genética, explorador de pedigree e simulador de cruzas."
    >
      <div className="flex gap-4 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('tree')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
            ${activeTab === 'tree' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <GitFork className="h-4 w-4" />
          Árvore Genealógica
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
            ${activeTab === 'simulator' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Beaker className="h-4 w-4" />
          Simulador de Cruzas
        </button>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-slate-500">Carregando dados...</p>
        </div>
      ) : activeTab === 'tree' ? (
        <div className="flex flex-col gap-6">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <select
              className="w-full max-w-md p-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
              value={selectedTreeAnimal}
              onChange={(e) => setSelectedTreeAnimal(e.target.value)}
            >
              <option value="">Selecione um Animal</option>
              {animals.map(a => (
                <option key={a.id} value={a.id}>
                  {a.identification} {a.name ? `- ${a.name}` : ''}
                </option>
              ))}
            </select>
          </div>

          {familyTree ? (
            <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
              <div className="min-w-[800px] flex flex-col items-center gap-8">
                {/* Gen 2 */}
                <div className="flex gap-16 w-full justify-center">
                  <div className="flex gap-4 w-1/2 justify-center">
                    <div className="w-48">{renderTreeCard(familyTree.paternalGrandfather, 'Avô Paterno')}</div>
                    <div className="w-48">{renderTreeCard(familyTree.paternalGrandmother, 'Avó Paterna')}</div>
                  </div>
                  <div className="flex gap-4 w-1/2 justify-center">
                    <div className="w-48">{renderTreeCard(familyTree.maternalGrandfather, 'Avô Materno')}</div>
                    <div className="w-48">{renderTreeCard(familyTree.maternalGrandmother, 'Avó Materna')}</div>
                  </div>
                </div>

                {/* Gen 1 */}
                <div className="flex gap-16 w-full justify-center">
                  <div className="w-64">{renderTreeCard(familyTree.father, 'Pai')}</div>
                  <div className="w-64">{renderTreeCard(familyTree.mother, 'Mãe')}</div>
                </div>

                {/* Gen 0 */}
                <div className="w-80">
                  {renderTreeCard(familyTree.animal, 'Animal Selecionado')}
                </div>
              </div>
            </div>
          ) : selectedTreeAnimal && (
            <p className="text-slate-500 text-center py-8">Gerando árvore...</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <select
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                value={selectedFemale}
                onChange={(e) => setSelectedFemale(e.target.value)}
              >
                <option value="">Fêmea (Matriz / Novilha)</option>
                {animals.filter(a => a.sex === 'female' || a.category === 'matrix' || a.category === 'heifer').map(a => (
                  <option key={a.id} value={a.id}>
                    {a.identification} {a.name ? `- ${a.name}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                value={selectedMale}
                onChange={(e) => setSelectedMale(e.target.value)}
              >
                <option value="">Macho (Touro / Sêmen)</option>
                <optgroup label="Touros do Rebanho">
                  {animals.filter(a => a.sex === 'male' || a.category === 'bull').map(a => (
                    <option key={a.id} value={a.id}>
                      {a.identification} {a.name ? `- ${a.name}` : ''}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Sêmen (Estoque)">
                  {semenList.map(s => (
                    <option key={s.id} value={s.id}>
                      SÊMEN: {s.bull_name} {s.code ? `(${s.code})` : ''}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {simulationResult && (
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-600" />
                Relatório de Cruzamento
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Nota */}
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Nota Geral</span>
                  <div className={`text-6xl font-black ${
                    simulationResult.score >= 8 ? 'text-emerald-600' :
                    simulationResult.score >= 5 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {simulationResult.score}
                    <span className="text-2xl text-slate-400 font-normal">/10</span>
                  </div>
                  <div className="mt-4 w-full bg-white rounded border border-slate-100 p-3 text-xs text-slate-600">
                    <p className="font-bold mb-1 text-slate-700">Como essa nota foi calculada?</p>
                    <ul className="list-disc list-inside space-y-1">
                      {simulationResult.breakdown.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Detalhes */}
                <div className="md:col-span-2 flex flex-col gap-4">
                  {/* Consanguinidade */}
                  <div className={`p-4 rounded-lg border ${
                    simulationResult.inbreedingLevel === 'critical' ? 'bg-red-50 border-red-200 text-red-800' :
                    simulationResult.inbreedingLevel === 'high' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                    simulationResult.inbreedingLevel === 'distant' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                    'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}>
                    <div className="flex items-center gap-2 font-bold mb-1">
                      {simulationResult.inbreedingLevel === 'none' ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
                      Análise de Consanguinidade (Endogamia)
                    </div>
                    <p className="text-sm">{simulationResult.inbreedingMessage}</p>
                  </div>

                  {/* Vigor Hibrido */}
                  <div className="p-4 rounded-lg border bg-indigo-50 border-indigo-200 text-indigo-800">
                    <div className="flex items-center gap-2 font-bold mb-1">
                      <Search className="h-5 w-5" />
                      Análise de Raças (Heterose)
                    </div>
                    <p className="text-sm">{simulationResult.heterosisMessage}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
