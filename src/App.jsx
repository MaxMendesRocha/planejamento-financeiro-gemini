import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Wallet, TrendingUp, PlusCircle, Trash2, CheckCircle2, 
  Utensils, Landmark, Plane, Settings, X, ChevronLeft, 
  ChevronRight, Repeat, PieChart as PieIcon, Download, 
  Upload, Calendar, Database, Loader2, Target, Trophy,
  Smartphone, ShieldCheck, Edit2, AlertTriangle
} from 'lucide-react';

// --- CAMADA DE BANCO DE DADOS (VERSÃO 2) ---
const DB_NAME = 'FamilyWealthDB';
const DB_VERSION = 2;

const dbHelper = {
  open: () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('incomes')) db.createObjectStore('incomes', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('fixedExpenses')) db.createObjectStore('fixedExpenses', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('transactions')) db.createObjectStore('transactions', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('goals')) db.createObjectStore('goals', { keyPath: 'id' });
      };

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  },

  getAll: async (storeName) => {
    const db = await dbHelper.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  add: async (storeName, item) => {
    const db = await dbHelper.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  delete: async (storeName, id) => {
    const db = await dbHelper.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },
  
  clearStore: async (storeName) => {
    const db = await dbHelper.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
};

// --- UTILITÁRIOS ---
const calculateCLT = (grossSalary) => {
  if (!grossSalary) return { net: 0, inss: 0, irrf: 0 };
  let salary = parseFloat(grossSalary);
  let inss = 0;
  if (salary > 7786.02) inss = 908.85;
  else if (salary <= 1412.00) inss = salary * 0.075;
  else if (salary <= 2666.68) inss = (1412.00 * 0.075) + ((salary - 1412.00) * 0.09);
  else if (salary <= 4000.03) inss = (1412.00 * 0.075) + ((2666.68 - 1412.00) * 0.09) + ((salary - 2666.68) * 0.12);
  else inss = (1412.00 * 0.075) + ((2666.68 - 1412.00) * 0.09) + ((4000.03 - 2666.68) * 0.12) + ((salary - 4000.03) * 0.14);

  const baseIRRF = salary - inss;
  let irrf = 0;
  if (baseIRRF <= 2259.20) irrf = 0;
  else if (baseIRRF <= 2826.65) irrf = (baseIRRF * 0.075) - 169.44;
  else if (baseIRRF <= 3751.05) irrf = (baseIRRF * 0.15) - 381.44;
  else if (baseIRRF <= 4664.68) irrf = (baseIRRF * 0.225) - 662.77;
  else irrf = (baseIRRF * 0.275) - 896.00;
  
  return { net: salary - inss - (irrf < 0 ? 0 : irrf), inss, irrf };
};

// --- COMPONENTES UI ---

const InstallPWAAlert = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <div className="bg-slate-800 text-white px-4 py-3 flex justify-between items-center text-sm sticky top-0 z-50 shadow-lg border-b border-slate-700">
      <div className="flex items-center gap-2">
        <Smartphone size={16} className="text-emerald-400 animate-pulse" />
        <span>Instale o App para acesso offline</span>
      </div>
      <button onClick={handleInstall} className="bg-emerald-600 px-3 py-1 rounded-full text-xs font-bold hover:bg-emerald-500 transition-colors">
        Instalar Agora
      </button>
    </div>
  );
};

const DonutChart = ({ data, size = 180 }) => {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  let cumulativeAngle = 0;
  if (total === 0) return <div className="relative flex items-center justify-center" style={{ width: size, height: size }}><div className="absolute inset-0 rounded-full border-[12px] border-slate-100"></div></div>;

  return (
    <svg width={size} height={size} viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)' }}>
      {data.map((slice, index) => {
        if (slice.value === 0) return null;
        const startAngle = cumulativeAngle;
        const sliceAngle = (slice.value / total) * 2 * Math.PI;
        cumulativeAngle += sliceAngle;
        const x1 = Math.cos(startAngle);
        const y1 = Math.sin(startAngle);
        const x2 = Math.cos(startAngle + sliceAngle);
        const y2 = Math.sin(startAngle + sliceAngle);
        const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
        if (Math.abs(sliceAngle - 2 * Math.PI) < 0.001) return <circle key={index} cx="0" cy="0" r="1" fill={slice.color} stroke="white" strokeWidth="0.05" />;
        const pathData = `M ${x1} ${y1} A 1 1 0 ${largeArcFlag} 1 ${x2} ${y2} L 0 0`;
        return <path key={index} d={pathData} fill={slice.color} stroke="white" strokeWidth="0.05" />;
      })}
      <circle cx="0" cy="0" r="0.65" fill="white" />
    </svg>
  );
};

const GoalCard = ({ goal, onDelete, monthlyCost = 0 }) => {
  let targetDisplay = goal.targetAmount;
  let label = "Meta Fixa";

  if (goal.isEmergencyFund) {
    targetDisplay = monthlyCost * (goal.monthsOfSecurity || 6);
    label = `Reserva (${goal.monthsOfSecurity} meses)`;
  }

  const percentage = targetDisplay > 0 ? Math.min(100, (goal.currentAmount / targetDisplay) * 100) : 0;
  
  return (
    <div className={`p-4 rounded-xl border shadow-sm relative group overflow-hidden hover:shadow-md transition-all ${goal.isEmergencyFund ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100'}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-inner ${goal.isEmergencyFund ? 'bg-white text-amber-500' : 'bg-slate-50'}`}>
            {goal.isEmergencyFund ? '🚨' : (goal.emoji || '🎯')}
          </div>
          <div>
            <h4 className={`font-bold text-sm ${goal.isEmergencyFund ? 'text-amber-800' : 'text-slate-700'}`}>{goal.name}</h4>
            <p className="text-[10px] text-slate-400">
               {label}: {targetDisplay.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
            </p>
          </div>
        </div>
        <button onClick={() => onDelete(goal.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white rounded-full hover:bg-red-50">
          <Trash2 size={14} />
        </button>
      </div>
      
      <div className="mt-2">
        <div className="flex justify-between text-[10px] font-semibold mb-1">
          <span className="text-emerald-600">{goal.currentAmount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
          <span className="text-slate-400">{percentage.toFixed(1)}%</span>
        </div>
        <div className="w-full h-2 bg-slate-200/50 rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r transition-all duration-1000 ease-out ${goal.isEmergencyFund ? 'from-amber-400 to-amber-600' : 'from-emerald-400 to-emerald-600'}`} 
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

// --- MODAIS ---

const GoalManager = ({ goals, onUpdate, onClose }) => {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [emoji, setEmoji] = useState('✈️');
  const [isEmergency, setIsEmergency] = useState(false);
  const [months, setMonths] = useState(6);

  const emojis = ['✈️', '🏠', '🚗', '👴', '👶', '📚', '🚑', '💍', '💻', '🏖️'];

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name) return;
    
    // Se não for emergência, precisa de target. Se for, o target é dinâmico (0 por enquanto).
    if (!isEmergency && !target) return;

    await dbHelper.add('goals', {
      id: Date.now(),
      name,
      targetAmount: isEmergency ? 0 : parseFloat(target), // 0 indica dinâmico
      currentAmount: parseFloat(current) || 0,
      emoji: isEmergency ? '🚨' : emoji,
      isEmergencyFund: isEmergency,
      monthsOfSecurity: isEmergency ? parseInt(months) : 0
    });
    onUpdate();
    setName(''); setTarget(''); setCurrent(''); setIsEmergency(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Trophy className="text-amber-500" size={20} /> Nova Meta
          </h2>
          <button onClick={onClose}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <form onSubmit={handleAdd} className="space-y-4 mb-6">
            
            {/* Toggle Tipo de Meta */}
            <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
              <button 
                type="button" 
                onClick={() => setIsEmergency(false)}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${!isEmergency ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
              >
                Meta Comum
              </button>
              <button 
                type="button" 
                onClick={() => { setIsEmergency(true); setName('Reserva de Emergência'); }}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${isEmergency ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-slate-400'}`}
              >
                <AlertTriangle size={12} /> Reserva de Emergência
              </button>
            </div>

            {!isEmergency && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ÍCONE</label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {emojis.map(e => (
                    <button key={e} type="button" onClick={() => setEmoji(e)} className={`w-10 h-10 rounded-lg text-xl flex-shrink-0 border transition-all ${emoji === e ? 'bg-amber-100 border-amber-400 scale-110' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">NOME DA META</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Viagem Disney" className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>

            {isEmergency ? (
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                <p className="text-xs text-amber-700 mb-3 font-medium">
                  A reserva de emergência será calculada automaticamente baseada no seu custo de vida mensal (Essencial + Lazer).
                </p>
                <label className="block text-xs font-bold text-amber-800 mb-2">QUANTOS MESES DE SEGURANÇA?</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="1" max="24" 
                    value={months} 
                    onChange={e => setMonths(e.target.value)} 
                    className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <span className="text-lg font-bold text-amber-600 min-w-[3rem] text-center">{months}</span>
                </div>
                <p className="text-center text-xs text-amber-600 mt-1">meses</p>
              </div>
            ) : (
               <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">VALOR ALVO (R$)</label>
                  <input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="10000.00" className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">JÁ GUARDADO (R$)</label>
              <input type="number" value={current} onChange={e => setCurrent(e.target.value)} placeholder="0.00" className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            
            <button className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg font-bold shadow-md shadow-amber-200 transition-colors">Criar Meta</button>
          </form>
        </div>
      </div>
    </div>
  );
};

const IncomeManager = ({ incomes, onUpdate, onClose }) => {
  const [name, setName] = useState(''); const [amount, setAmount] = useState(''); const [type, setType] = useState('salary'); const [basis, setBasis] = useState('net');
  const handleAdd = async (e) => { e.preventDefault(); if (!name || !amount) return; await dbHelper.add('incomes', { id: Date.now(), name, rawAmount: parseFloat(amount), netAmount: (type === 'salary' && basis === 'gross') ? calculateCLT(parseFloat(amount)).net : parseFloat(amount), type, basis }); onUpdate(); setName(''); setAmount(''); };
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex justify-between mb-4 items-center"><h2 className="font-bold flex gap-2 text-lg text-slate-800"><Wallet className="text-emerald-600"/> Gerenciar Rendas</h2><button onClick={onClose}><X size={24} className="text-slate-400 hover:text-slate-600"/></button></div>
        <form onSubmit={handleAdd} className="space-y-4">
          <div><label className="text-xs font-bold text-slate-500 block mb-1">DESCRIÇÃO</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Salário, Aluguel" className="w-full p-2 border rounded text-sm"/></div>
          <div className="flex gap-2">
            <div className="flex-1"><label className="text-xs font-bold text-slate-500 block mb-1">VALOR</label><input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0,00" className="w-full p-2 border rounded text-sm"/></div>
            <div className="flex-1"><label className="text-xs font-bold text-slate-500 block mb-1">TIPO</label><select value={type} onChange={e=>setType(e.target.value)} className="w-full p-2 border rounded text-sm bg-white"><option value="salary">Salário</option><option value="benefit">Benefício</option></select></div>
          </div>
          {type==='salary'&&<div className="flex gap-4 bg-slate-50 p-2 rounded border border-slate-100"><label className="flex items-center gap-2 text-sm"><input type="radio" checked={basis==='gross'} onChange={()=>setBasis('gross')}/> Bruto (CLT)</label><label className="flex items-center gap-2 text-sm"><input type="radio" checked={basis==='net'} onChange={()=>setBasis('net')}/> Líquido</label></div>}
          <button className="w-full bg-slate-800 text-white p-2 rounded font-medium hover:bg-slate-700 transition-colors">Adicionar</button>
        </form>
        <div className="mt-4 space-y-2 border-t pt-4 border-slate-100">{incomes.map(i=><div key={i.id} className="flex justify-between items-center border p-2 rounded bg-slate-50"><span>{i.name}</span><div className="flex gap-3 items-center font-bold text-emerald-600"><span>{i.netAmount.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span><Trash2 size={16} className="text-slate-300 cursor-pointer hover:text-red-500" onClick={async()=>{await dbHelper.delete('incomes',i.id);onUpdate()}}/></div></div>)}</div>
      </div>
    </div>
  );
};

const FixedExpenseManager = ({ fixedExpenses, onUpdate, onClose }) => {
  const [name, setName] = useState(''); const [amount, setAmount] = useState(''); const [category, setCategory] = useState('essentials');
  const handleAdd = async (e) => { e.preventDefault(); if (!name || !amount) return; await dbHelper.add('fixedExpenses', { id: Date.now(), name, amount: parseFloat(amount), category }); onUpdate(); setName(''); setAmount(''); };
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex justify-between mb-4 items-center"><h2 className="font-bold flex gap-2 text-lg text-slate-800"><Repeat className="text-blue-600"/> Gastos Fixos</h2><button onClick={onClose}><X size={24} className="text-slate-400 hover:text-slate-600"/></button></div>
        <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded mb-4">Itens aqui são lançados automaticamente todo mês.</p>
        <form onSubmit={handleAdd} className="space-y-4">
          <div><label className="text-xs font-bold text-slate-500 block mb-1">DESCRIÇÃO</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Escola, Internet" className="w-full p-2 border rounded text-sm"/></div>
          <div className="flex gap-2">
            <div className="flex-1"><label className="text-xs font-bold text-slate-500 block mb-1">VALOR</label><input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0,00" className="w-full p-2 border rounded text-sm"/></div>
            <div className="flex-1"><label className="text-xs font-bold text-slate-500 block mb-1">CATEGORIA</label><select value={category} onChange={e=>setCategory(e.target.value)} className="w-full p-2 border rounded text-sm bg-white"><option value="essentials">Essencial</option><option value="lifestyle">Lazer</option></select></div>
          </div>
          <button className="w-full bg-blue-600 text-white p-2 rounded font-medium hover:bg-blue-700 transition-colors">Adicionar Fixo</button>
        </form>
        <div className="mt-4 space-y-2 border-t pt-4 border-slate-100">{fixedExpenses.map(i=><div key={i.id} className="flex justify-between items-center border p-2 rounded bg-slate-50"><span>{i.name}</span><div className="flex gap-3 items-center font-bold text-slate-700"><span>{i.amount.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span><Trash2 size={16} className="text-slate-300 cursor-pointer hover:text-red-500" onClick={async()=>{await dbHelper.delete('fixedExpenses',i.id);onUpdate()}}/></div></div>)}</div>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---

export default function App() {
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Dados do DB
  const [incomes, setIncomes] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);

  // UI State
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showFixedModal, setShowFixedModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  
  // Transaction Input State
  const [descInput, setDescInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [catInput, setCatInput] = useState('lifestyle');
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [editingId, setEditingId] = useState(null); // Estado para edição

  const loadData = useCallback(async () => {
    try {
      const inc = await dbHelper.getAll('incomes');
      const fix = await dbHelper.getAll('fixedExpenses');
      const trans = await dbHelper.getAll('transactions');
      const gls = await dbHelper.getAll('goals'); 

      setIncomes(inc); setFixedExpenses(fix); setTransactions(trans); setGoals(gls);
    } catch (error) { console.error("Erro DB:", error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Cálculos
  const monthTransactions = useMemo(() => transactions.filter(t => {
    const tDate = new Date(t.dateISO);
    return tDate.getMonth() === currentDate.getMonth() && tDate.getFullYear() === currentDate.getFullYear();
  }), [transactions, currentDate]);

  const totalIncome = useMemo(() => incomes.reduce((acc, curr) => acc + curr.netAmount, 0), [incomes]);

  const fixedTotals = useMemo(() => fixedExpenses.reduce((acc, item) => {
    if (item.category === 'essentials') acc.essentials += item.amount;
    if (item.category === 'lifestyle') acc.lifestyle += item.amount;
    return acc;
  }, { essentials: 0, lifestyle: 0 }), [fixedExpenses]);

  const variableTotals = useMemo(() => monthTransactions.reduce((acc, t) => {
    if (t.category === 'essentials') acc.essentials += t.amount;
    if (t.category === 'lifestyle') acc.lifestyle += t.amount;
    if (t.category === 'investments') acc.investments += t.amount;
    return acc;
  }, { essentials: 0, lifestyle: 0, investments: 0 }), [monthTransactions]);

  const finalTotals = useMemo(() => ({
    essentials: fixedTotals.essentials + variableTotals.essentials,
    lifestyle: fixedTotals.lifestyle + variableTotals.lifestyle,
    investments: variableTotals.investments
  }), [fixedTotals, variableTotals]);

  // Custo de vida médio (Essenciais + Lazer) para cálculo da reserva
  const monthlyLivingCost = finalTotals.essentials + finalTotals.lifestyle;

  const chartData = useMemo(() => [
    { value: finalTotals.essentials, color: '#3b82f6' }, 
    { value: finalTotals.lifestyle, color: '#f43f5e' },
    { value: finalTotals.investments, color: '#10b981' },
  ], [finalTotals]);

  const addTransaction = async (e) => {
    e.preventDefault();
    if (!descInput || !amountInput) return;
    
    const amountVal = parseFloat(amountInput);
    
    // Atualiza saldo da meta se for investimento
    if (catInput === 'investments' && selectedGoalId) {
      const goalToUpdate = goals.find(g => g.id === parseInt(selectedGoalId));
      if (goalToUpdate) {
        await dbHelper.add('goals', { ...goalToUpdate, currentAmount: goalToUpdate.currentAmount + amountVal });
      }
    }

    const transactionData = {
      id: editingId || Date.now(), // Usa ID existente se estiver editando
      description: descInput,
      amount: amountVal,
      category: catInput,
      goalId: selectedGoalId || null, 
      dateISO: currentDate.toISOString(),
    };

    await dbHelper.add('transactions', transactionData);
    
    loadData();
    // Limpar
    setDescInput(''); setAmountInput(''); setSelectedGoalId(''); setCatInput('lifestyle'); setEditingId(null);
  };

  const deleteGoal = async (id) => {
    if(window.confirm('Excluir esta meta? O dinheiro guardado nela não será apagado do histórico.')) {
      await dbHelper.delete('goals', id);
      loadData();
    }
  };

  const startEditing = (t) => {
    setDescInput(t.description);
    setAmountInput(t.amount);
    setCatInput(t.category);
    setSelectedGoalId(t.goalId || '');
    setEditingId(t.id);
    // Rola para o formulário (em mobile isso ajuda muito)
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center flex-col gap-2"><Loader2 className="animate-spin text-emerald-600" size={48}/><p className="text-slate-500 font-medium">Carregando Banco de Dados...</p></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-24">
      <InstallPWAAlert />
      {showIncomeModal && <IncomeManager incomes={incomes} onUpdate={loadData} onClose={() => setShowIncomeModal(false)} />}
      {showFixedModal && <FixedExpenseManager fixedExpenses={fixedExpenses} onUpdate={loadData} onClose={() => setShowFixedModal(false)} />}
      {showGoalModal && <GoalManager goals={goals} onUpdate={loadData} onClose={() => setShowGoalModal(false)} />}

      <header className="bg-slate-900 text-white pt-8 pb-20 px-4 shadow-xl relative overflow-hidden rounded-b-[2.5rem]">
         <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
         <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
         
         <div className="max-w-6xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 shadow-lg"><Landmark className="text-emerald-400" size={28} /></div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Plano Financeiro Familiar</h1>
                  <p className="text-slate-400 text-xs flex items-center gap-1 font-medium bg-slate-800/50 px-2 py-1 rounded-full w-fit mt-1">
                    <ShieldCheck size={10} className="text-emerald-400"/> Sistema Seguro • PWA
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                 <button onClick={() => setShowGoalModal(true)} className="bg-amber-500/10 text-amber-500 border border-amber-500/50 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-amber-500 hover:text-white transition-all shadow-sm"><Trophy size={16}/> Metas</button>
                 <button onClick={() => setShowFixedModal(true)} className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-700 transition-all text-blue-200"><Repeat size={16} className="text-blue-400"/> Fixos</button>
                 <button onClick={() => setShowIncomeModal(true)} className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-700 transition-all text-emerald-200"><Settings size={16} className="text-emerald-400"/> Rendas</button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-800/50 p-1.5 rounded-2xl backdrop-blur-sm border border-slate-700/50 max-w-sm mx-auto mb-8 shadow-inner">
               <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); }} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all"><ChevronLeft size={20}/></button>
               <span className="font-bold text-lg capitalize flex items-center gap-2 text-emerald-50"><Calendar size={18} className="text-emerald-400"/> {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
               <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); }} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all"><ChevronRight size={20}/></button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-sm shadow-sm"><p className="text-xs text-slate-400 mb-1 uppercase font-bold tracking-wider">Renda Líquida</p><p className="text-xl font-bold text-emerald-400">{totalIncome.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p></div>
               <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-sm shadow-sm"><p className="text-xs text-slate-400 mb-1 uppercase font-bold tracking-wider">Comprometido</p><p className="text-xl font-bold text-blue-400">{(fixedTotals.essentials + fixedTotals.lifestyle).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p></div>
               <div className="bg-emerald-900/20 p-4 rounded-2xl border border-emerald-500/20 backdrop-blur-sm col-span-2 md:col-span-2 flex justify-between items-center px-6 shadow-lg">
                  <div><p className="text-xs text-emerald-300/80 mb-1 uppercase font-bold tracking-wider">Saldo Livre Estimado</p><p className="text-3xl font-bold text-white">{(totalIncome - finalTotals.essentials - finalTotals.lifestyle - finalTotals.investments).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p></div>
                  <div className="bg-emerald-500/10 p-2 rounded-full"><Wallet className="text-emerald-400" size={24}/></div>
               </div>
            </div>
         </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 -mt-12 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
               <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2 relative z-10"><PieIcon size={16}/> Distribuição Real</h3>
               <div className="relative z-10">
                 <DonutChart data={chartData} size={180} />
                 <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Total Gasto</span>
                    <span className="text-xl font-bold text-slate-800">{(finalTotals.essentials + finalTotals.lifestyle + finalTotals.investments).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL', maximumFractionDigits:0})}</span>
                 </div>
               </div>
               <div className="flex gap-3 mt-6 text-[10px] uppercase font-bold text-slate-500 relative z-10">
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-200"></div> Essencial</span>
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-200"></div> Lazer</span>
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></div> Futuro</span>
               </div>
            </div>

            <div className={`bg-white p-6 rounded-2xl shadow-sm border relative overflow-hidden ${editingId ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-100'}`}>
               <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
               <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2 relative z-10">
                 {editingId ? <><Edit2 size={18} className="text-emerald-600"/> Editando Movimento</> : <><PlusCircle size={18} className="text-emerald-600"/> Adicionar Movimento</>}
               </h3>
               
               {editingId && (
                 <button onClick={() => { setEditingId(null); setDescInput(''); setAmountInput(''); }} className="absolute top-4 right-4 text-xs font-bold text-red-500 hover:text-red-700 z-20">Cancelar</button>
               )}

               <form onSubmit={addTransaction} className="space-y-3 relative z-10">
                  <input type="text" placeholder="O que você pagou?" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" value={descInput} onChange={e => setDescInput(e.target.value)}/>
                  <input type="number" placeholder="R$ 0,00" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" value={amountInput} onChange={e => setAmountInput(e.target.value)}/>
                  
                  <div className="grid grid-cols-3 gap-2">
                     <button type="button" onClick={() => setCatInput('essentials')} className={`p-2 rounded-xl text-[10px] font-bold border transition-all ${catInput === 'essentials' ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>ESSENCIAL</button>
                     <button type="button" onClick={() => setCatInput('lifestyle')} className={`p-2 rounded-xl text-[10px] font-bold border transition-all ${catInput === 'lifestyle' ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-200' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>LAZER</button>
                     <button type="button" onClick={() => setCatInput('investments')} className={`p-2 rounded-xl text-[10px] font-bold border transition-all ${catInput === 'investments' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>INVESTIR</button>
                  </div>

                  {catInput === 'investments' && goals.length > 0 && (
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 animate-fadeIn">
                      <label className="block text-[10px] font-bold text-amber-700 mb-1 flex items-center gap-1"><Target size={12}/> VINCULAR A UMA META?</label>
                      <select value={selectedGoalId} onChange={e => setSelectedGoalId(e.target.value)} className="w-full text-sm p-2 rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                        <option value="">Não vincular (Aporte genérico)</option>
                        {goals.map(g => <option key={g.id} value={g.id}>{g.emoji || (g.isEmergencyFund ? '🚨' : '')} {g.name}</option>)}
                      </select>
                    </div>
                  )}

                  <button className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-slate-300 hover:bg-slate-800 active:scale-95 transition-all">
                    {editingId ? 'Salvar Alteração' : 'Lançar no Sistema'}
                  </button>
               </form>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            
            {goals.length > 0 ? (
              <div>
                <h3 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2 ml-1"><Trophy size={16} className="text-amber-500"/> Suas Conquistas</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {goals.map(goal => <GoalCard key={goal.id} goal={goal} onDelete={deleteGoal} monthlyCost={monthlyLivingCost} />)}
                </div>
              </div>
            ) : (
              <div onClick={() => setShowGoalModal(true)} className="bg-amber-50 border-2 border-dashed border-amber-300 p-8 rounded-2xl flex items-center justify-center gap-4 cursor-pointer hover:bg-amber-100 transition-colors group">
                <div className="p-4 bg-white rounded-full text-amber-500 shadow-sm group-hover:scale-110 transition-transform"><PlusCircle size={28}/></div>
                <div><h3 className="font-bold text-amber-800 text-lg">Criar Primeira Meta</h3><p className="text-sm text-amber-600">Gamifique sua poupança (Viagens, Casa...)</p></div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px] flex flex-col">
              <div className="p-5 bg-slate-50/80 border-b border-slate-100 font-bold text-slate-700 text-sm flex justify-between items-center backdrop-blur-sm">
                <span>Extrato Mensal</span>
                <span className="text-xs font-normal text-slate-400 bg-white px-2 py-1 rounded-md border">{monthTransactions.length} lançamentos</span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[500px]">
                 {fixedExpenses.length > 0 && (
                   <div className="bg-slate-50/50 border-b border-slate-100">
                     <p className="px-5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100/50 sticky top-0">Gastos Fixos (Automáticos)</p>
                     {fixedExpenses.map(f => (
                       <div key={f.id} className="px-5 py-3 flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity">
                         <div className="flex items-center gap-3"><Repeat size={14} className="text-slate-400"/><span className="text-sm font-medium text-slate-600">{f.name}</span></div>
                         <span className="text-sm font-bold text-slate-500">{f.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                       </div>
                     ))}
                   </div>
                 )}
                 <div>
                    <p className="px-5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white sticky top-0 border-b border-slate-50 z-10">Variáveis Recentes</p>
                    {monthTransactions.length === 0 ? <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2"><div className="bg-slate-50 p-3 rounded-full"><CheckCircle2 size={24} className="text-slate-300"/></div><p>Tudo tranquilo! Nenhum gasto variável ainda.</p></div> : 
                    monthTransactions.map(t => (
                      <div key={t.id} className="px-5 py-3.5 flex justify-between items-center border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm ${t.category==='investments'?'bg-emerald-500':t.category==='lifestyle'?'bg-rose-500':'bg-blue-500'}`}></div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{t.description}</p>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                              {new Date(t.dateISO).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})} • 
                              <span className="uppercase">{t.category === 'essentials' ? 'Essencial' : t.category === 'lifestyle' ? 'Lazer' : 'Aporte'}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${t.category === 'investments' ? 'text-emerald-600' : 'text-slate-700'}`}>{t.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                          
                          {/* BOTÃO EDITAR */}
                          <button onClick={() => startEditing(t)} className="text-slate-300 hover:text-blue-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-blue-50 rounded" title="Editar">
                            <Edit2 size={14}/>
                          </button>
                          
                          {/* BOTÃO EXCLUIR */}
                          <button onClick={async()=>{await dbHelper.delete('transactions',t.id);loadData()}} className="text-slate-300 hover:text-red-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-red-50 rounded" title="Excluir">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}