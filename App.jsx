import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  PlusCircle, 
  Trash2, 
  CheckCircle2, 
  Utensils,
  Landmark,
  Plane,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  Repeat,
  PieChart as PieIcon,
  Download,
  Upload,
  Calendar,
  Database,
  Loader2
} from 'lucide-react';

// --- CAMADA DE BANCO DE DADOS (INDEXEDDB WRAPPER) ---
// Simula um comportamento SQL/SQLite localmente no navegador
const DB_NAME = 'FamilyWealthDB';
const DB_VERSION = 1;

const dbHelper = {
  open: () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('incomes')) db.createObjectStore('incomes', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('fixedExpenses')) db.createObjectStore('fixedExpenses', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('transactions')) db.createObjectStore('transactions', { keyPath: 'id' });
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
      const request = store.put(item); // put atualiza se existir ou cria novo
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

const getMonthKey = (date) => `${date.getMonth() + 1}-${date.getFullYear()}`;

// --- COMPONENTES UI ---

const DonutChart = ({ data, size = 180 }) => {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  let cumulativeAngle = 0;

  if (total === 0) {
    return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <div className="absolute inset-0 rounded-full border-[12px] border-slate-100"></div>
      </div>
    );
  }

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

        // Se for 100% do gráfico, desenha um círculo completo
        if (Math.abs(sliceAngle - 2 * Math.PI) < 0.001) {
             return <circle key={index} cx="0" cy="0" r="1" fill={slice.color} stroke="white" strokeWidth="0.05" />
        }

        const pathData = `M ${x1} ${y1} A 1 1 0 ${largeArcFlag} 1 ${x2} ${y2} L 0 0`;
        return <path key={index} d={pathData} fill={slice.color} stroke="white" strokeWidth="0.05" />;
      })}
      {/* Círculo interno para fazer o "furo" do Donut */}
      <circle cx="0" cy="0" r="0.65" fill="white" />
    </svg>
  );
};

const SummaryCard = ({ title, amount, total, icon: Icon, color, type }) => {
  const percentage = total > 0 ? Math.min(100, Math.max(0, (amount / total) * 100)) : 0;
  const isOverBudget = amount > total;
  let barColor = color.replace('text-', 'bg-').replace('bg-opacity-20', '');
  if (type === 'expense' && isOverBudget) barColor = 'bg-red-500';
  if (type === 'investment' && percentage >= 100) barColor = 'bg-emerald-500';

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden flex flex-col justify-between h-full group hover:shadow-md transition-shadow">
      <div className={`absolute -right-4 -top-4 p-4 opacity-[0.07] group-hover:opacity-10 transition-opacity ${color}`}>
        <Icon size={80} />
      </div>
      <div>
        <div className="flex justify-between items-start mb-3 relative z-10">
          <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
            <Icon size={20} className={color.split(' ')[1]} />
          </div>
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${isOverBudget && type === 'expense' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
            {percentage.toFixed(0)}%
          </span>
        </div>
        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</h3>
        <p className="text-2xl font-bold text-slate-800 tracking-tight">
          {amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
      </div>
      <div className="mt-4 relative z-10">
        <div className="flex justify-between text-[10px] text-slate-400 mb-1 uppercase font-semibold">
          <span>Progresso</span>
          <span>Meta: {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${percentage}%` }}></div>
        </div>
      </div>
    </div>
  );
};

// --- MODAIS ---

const IncomeManager = ({ incomes, onUpdate, onClose }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('salary');
  const [basis, setBasis] = useState('net');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name || !amount) return;
    const rawAmount = parseFloat(amount);
    const netAmount = (type === 'salary' && basis === 'gross') ? calculateCLT(rawAmount).net : rawAmount;
    
    await dbHelper.add('incomes', { id: Date.now(), name, rawAmount, netAmount, type, basis });
    onUpdate();
    setName(''); setAmount('');
  };

  const handleDelete = async (id) => {
    await dbHelper.delete('incomes', id);
    onUpdate();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="text-emerald-600" size={20} /> Fontes de Renda
          </h2>
          <button onClick={onClose}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form onSubmit={handleAdd} className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">DESCRIÇÃO</label>
              <input type="text" className="w-full p-2 rounded border text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Salário" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">VALOR</label>
                <input type="number" className="w-full p-2 rounded border text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">TIPO</label>
                 <select className="w-full p-2 rounded border text-sm bg-white" value={type} onChange={e => setType(e.target.value)}>
                   <option value="salary">Salário</option>
                   <option value="benefit">Benefício</option>
                 </select>
              </div>
            </div>
            {type === 'salary' && (
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-xs font-medium"><input type="radio" checked={basis === 'gross'} onChange={() => setBasis('gross')} /> Bruto (CLT)</label>
                <label className="flex items-center gap-2 text-xs font-medium"><input type="radio" checked={basis === 'net'} onChange={() => setBasis('net')} /> Líquido</label>
              </div>
            )}
            <button className="w-full bg-slate-800 text-white py-2 rounded-lg text-sm mt-2 hover:bg-slate-700 transition-colors">Adicionar Renda</button>
          </form>
          <div className="space-y-2">
            {incomes.map(inc => (
              <div key={inc.id} className="flex justify-between items-center bg-white border p-3 rounded-lg shadow-sm">
                <div><p className="font-medium text-sm">{inc.name}</p><p className="text-xs text-slate-400">{inc.basis === 'gross' ? 'Bruto' : 'Líquido'}</p></div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-emerald-600 text-sm">{inc.netAmount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                  <button onClick={() => handleDelete(inc.id)}><Trash2 size={14} className="text-slate-300 hover:text-red-500 transition-colors" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const FixedExpenseManager = ({ fixedExpenses, onUpdate, onClose }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('essentials');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name || !amount) return;
    await dbHelper.add('fixedExpenses', { id: Date.now(), name, amount: parseFloat(amount), category });
    onUpdate();
    setName(''); setAmount('');
  };

  const handleDelete = async (id) => {
    await dbHelper.delete('fixedExpenses', id);
    onUpdate();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Repeat className="text-blue-600" size={20} /> Gastos Fixos (Mensais)
          </h2>
          <button onClick={onClose}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <p className="text-sm text-slate-500 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100 text-blue-700">Estes itens serão projetados automaticamente em todos os meses.</p>
          <form onSubmit={handleAdd} className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">DESCRIÇÃO</label>
              <input type="text" className="w-full p-2 rounded border text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Escola, Internet" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">VALOR</label>
                <input type="number" className="w-full p-2 rounded border text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">CATEGORIA</label>
                 <select className="w-full p-2 rounded border text-sm bg-white" value={category} onChange={e => setCategory(e.target.value)}>
                   <option value="essentials">Essencial</option>
                   <option value="lifestyle">Estilo de Vida</option>
                 </select>
              </div>
            </div>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm mt-2 transition-colors">Adicionar Fixo</button>
          </form>
          <div className="space-y-2">
            {fixedExpenses.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-white border p-3 rounded-lg shadow-sm">
                <div><p className="font-medium text-sm">{item.name}</p><p className="text-xs text-slate-400">{item.category === 'essentials' ? 'Essencial' : 'Lazer'}</p></div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-700 text-sm">{item.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                  <button onClick={() => handleDelete(item.id)}><Trash2 size={14} className="text-slate-300 hover:text-red-500 transition-colors" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---

export default function App() {
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Dados do Banco de Dados
  const [incomes, setIncomes] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Modais e Inputs
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showFixedModal, setShowFixedModal] = useState(false);
  const [descInput, setDescInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [catInput, setCatInput] = useState('lifestyle');

  // --- CARREGAMENTO DE DADOS (DB) ---
  const loadData = useCallback(async () => {
    try {
      // Tenta carregar. Se falhar (primeiro acesso), pode vir vazio.
      const inc = await dbHelper.getAll('incomes');
      const fix = await dbHelper.getAll('fixedExpenses');
      const trans = await dbHelper.getAll('transactions');

      // Seed inicial se estiver vazio (apenas para demonstração na primeira vez)
      if (inc.length === 0 && fix.length === 0) {
        // Opcional: Popular com dados padrão se o usuário quiser
      }

      setIncomes(inc);
      setFixedExpenses(fix);
      setTransactions(trans);
    } catch (error) {
      console.error("Erro ao carregar DB:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- CÁLCULOS DO MÊS ---
  const monthTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.dateISO);
      return tDate.getMonth() === currentDate.getMonth() && tDate.getFullYear() === currentDate.getFullYear();
    });
  }, [transactions, currentDate]);

  const totalIncome = useMemo(() => incomes.reduce((acc, curr) => acc + curr.netAmount, 0), [incomes]);
  
  const goals = useMemo(() => ({
    essentials: totalIncome * 0.50,
    lifestyle: totalIncome * 0.30,
    investments: totalIncome * 0.20
  }), [totalIncome]);

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

  const totalSpent = finalTotals.essentials + finalTotals.lifestyle + finalTotals.investments;

  const chartData = useMemo(() => [
    { value: finalTotals.essentials, color: '#3b82f6' }, // Blue
    { value: finalTotals.lifestyle, color: '#f43f5e' },  // Rose
    { value: finalTotals.investments, color: '#10b981' }, // Emerald
  ], [finalTotals]);
  
  // --- AÇÕES ---

  const addTransaction = async (e) => {
    e.preventDefault();
    if (!descInput || !amountInput) return;
    const newT = {
      id: Date.now(),
      description: descInput,
      amount: parseFloat(amountInput),
      category: catInput,
      dateISO: currentDate.toISOString(),
      isFixed: false
    };
    
    await dbHelper.add('transactions', newT);
    loadData(); // Recarrega do banco
    setDescInput(''); setAmountInput('');
  };

  const deleteTransaction = async (id) => {
    await dbHelper.delete('transactions', id);
    loadData();
  };

  const changeMonth = (offset) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const exportData = async () => {
    const data = {
      incomes: await dbHelper.getAll('incomes'),
      fixedExpenses: await dbHelper.getAll('fixedExpenses'),
      transactions: await dbHelper.getAll('transactions')
    };
    const dataStr = JSON.stringify(data);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `family_wealth_db_${new Date().toISOString().slice(0, 10)}.json`);
    link.click();
  };

  const importData = (e) => {
    const fileReader = new FileReader();
    const file = e.target.files[0];
    if (!file) return;

    fileReader.readAsText(file, "UTF-8");
    fileReader.onload = async event => {
      try {
        const parsed = JSON.parse(event.target.result);
        if(window.confirm('ATENÇÃO: Isso apagará o banco de dados atual e importará o arquivo. Continuar?')) {
          setLoading(true);
          await dbHelper.clearStore('incomes');
          await dbHelper.clearStore('fixedExpenses');
          await dbHelper.clearStore('transactions');

          for (const item of (parsed.incomes || [])) await dbHelper.add('incomes', item);
          for (const item of (parsed.fixedExpenses || [])) await dbHelper.add('fixedExpenses', item);
          for (const item of (parsed.transactions || [])) await dbHelper.add('transactions', item);
          
          await loadData();
          setLoading(false);
        }
      } catch (error) {
        console.error("Erro import:", error);
        alert("Erro ao importar arquivo.");
        setLoading(false);
      }
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={48} />
        <p className="text-slate-500 font-medium animate-pulse">Carregando Banco de Dados Seguro...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      
      {showIncomeModal && <IncomeManager incomes={incomes} onUpdate={loadData} onClose={() => setShowIncomeModal(false)} />}
      {showFixedModal && <FixedExpenseManager fixedExpenses={fixedExpenses} onUpdate={loadData} onClose={() => setShowFixedModal(false)} />}

      <header className="bg-slate-900 text-white pt-8 pb-20 px-4 shadow-xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
         <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
         
         <div className="max-w-6xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                   <Landmark className="text-emerald-400" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Family Wealth <span className="text-white text-[10px] uppercase font-bold px-2 py-0.5 bg-blue-600 rounded-full ml-1">DB Edition</span></h1>
                  <p className="text-slate-400 text-xs flex items-center gap-1"><Database size={10}/> Armazenamento Local Seguro</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={exportData} className="p-2 text-slate-400 hover:text-white" title="Backup Download"><Download size={20}/></button>
                <label className="p-2 text-slate-400 hover:text-white cursor-pointer" title="Restaurar Backup">
                  <Upload size={20}/>
                  <input type="file" className="hidden" onChange={importData} accept=".json"/>
                </label>
                <div className="h-6 w-px bg-slate-700 mx-2"></div>
                <button onClick={() => setShowFixedModal(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium border border-slate-700 transition-all">
                  <Repeat size={14} className="text-blue-400"/> Gastos Fixos
                </button>
                <button onClick={() => setShowIncomeModal(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium border border-slate-700 transition-all">
                  <Settings size={14} className="text-emerald-400"/> Rendas
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-800/50 p-1 rounded-xl backdrop-blur-sm border border-slate-700/50 max-w-md mx-auto mb-6">
               <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"><ChevronLeft size={20}/></button>
               <div className="flex items-center gap-2">
                 <Calendar size={16} className="text-emerald-400"/>
                 <span className="font-bold text-lg capitalize">{currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
               </div>
               <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"><ChevronRight size={20}/></button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                 <p className="text-xs text-slate-400 mb-1">Renda Líquida Total</p>
                 <p className="text-xl font-bold text-emerald-400">{totalIncome.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
               </div>
               <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                 <p className="text-xs text-slate-400 mb-1">Comprometido (Fixos)</p>
                 <p className="text-xl font-bold text-blue-400">{(fixedTotals.essentials + fixedTotals.lifestyle).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
               </div>
               <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 backdrop-blur-sm col-span-2 md:col-span-2 flex items-center justify-between px-6">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Saldo Livre Estimado</p>
                    <p className="text-2xl font-bold text-white">{(totalIncome - finalTotals.essentials - finalTotals.lifestyle - finalTotals.investments).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400">Investido Mês</p>
                    <p className="text-sm font-bold text-emerald-400">{finalTotals.investments.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                  </div>
               </div>
            </div>
         </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 -mt-10 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          <div className="lg:col-span-1 space-y-6">
            {/* GRÁFICO CORRIGIDO E ALINHADO */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center relative overflow-hidden">
               <h3 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2 relative z-10"><PieIcon size={16}/> Distribuição Real</h3>
               <div className="relative z-10">
                 <DonutChart data={chartData} />
                 {/* Camada de Texto Centralizada */}
                 <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                   {totalSpent > 0 ? (
                     <>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Gasto</span>
                        <span className="text-lg font-bold text-slate-800">
                          {totalSpent.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL', maximumFractionDigits: 0})}
                        </span>
                     </>
                   ) : (
                     <span className="text-xs text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded-full">Sem dados</span>
                   )}
                 </div>
               </div>
               
               {/* Legenda */}
               {totalSpent > 0 && (
                 <div className="flex gap-4 mt-6 justify-center w-full relative z-10">
                   <div className="text-center">
                     <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-1"></div>
                     <p className="text-[10px] text-slate-400 uppercase">Essencial</p>
                   </div>
                   <div className="text-center">
                     <div className="w-3 h-3 bg-rose-500 rounded-full mx-auto mb-1"></div>
                     <p className="text-[10px] text-slate-400 uppercase">Lazer</p>
                   </div>
                   <div className="text-center">
                     <div className="w-3 h-3 bg-emerald-500 rounded-full mx-auto mb-1"></div>
                     <p className="text-[10px] text-slate-400 uppercase">Futuro</p>
                   </div>
                 </div>
               )}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><PlusCircle size={16} className="text-emerald-600"/> Novo Lançamento</h3>
               <form onSubmit={addTransaction} className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="Descrição" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={descInput} onChange={e => setDescInput(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <input 
                      type="number" 
                      placeholder="R$ 0,00" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={amountInput} onChange={e => setAmountInput(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                     <button type="button" onClick={() => setCatInput('essentials')} className={`p-2 rounded-lg text-xs font-medium border transition-colors ${catInput === 'essentials' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white hover:bg-slate-50'}`}>Essencial</button>
                     <button type="button" onClick={() => setCatInput('lifestyle')} className={`p-2 rounded-lg text-xs font-medium border transition-colors ${catInput === 'lifestyle' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-white hover:bg-slate-50'}`}>Lazer</button>
                     <button type="button" onClick={() => setCatInput('investments')} className={`p-2 rounded-lg text-xs font-medium border transition-colors ${catInput === 'investments' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white hover:bg-slate-50'}`}>Investir</button>
                  </div>
                  <button className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium shadow-lg shadow-slate-300 hover:bg-slate-800 transition-all">
                    Adicionar Movimento
                  </button>
               </form>
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <SummaryCard title="Necessidades (50%)" amount={finalTotals.essentials} total={goals.essentials} icon={Utensils} color="text-blue-500" type="expense" />
               <SummaryCard title="Estilo de Vida (30%)" amount={finalTotals.lifestyle} total={goals.lifestyle} icon={Plane} color="text-rose-500" type="expense" />
               <SummaryCard title="Liberdade (20%)" amount={finalTotals.investments} total={goals.investments} icon={TrendingUp} color="text-emerald-500" type="investment" />
             </div>

             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col min-h-[400px]">
                <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Extrato de {currentDate.toLocaleDateString('pt-BR', { month: 'long' })}</h3>
                  <span className="text-xs text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                     {monthTransactions.length} variáveis + {fixedExpenses.length} fixos
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[500px]">
                  {fixedExpenses.length > 0 && (
                    <div className="bg-slate-50/30">
                      <p className="px-5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100/50 sticky top-0 backdrop-blur-sm z-10 border-b border-slate-100">Gastos Fixos (Automáticos)</p>
                      {fixedExpenses.map(fix => (
                        <div key={`fix-${fix.id}`} className="px-5 py-3 flex justify-between items-center border-b border-slate-50 opacity-70 hover:opacity-100 transition-opacity">
                           <div className="flex items-center gap-3">
                              <Repeat size={14} className="text-slate-400"/>
                              <div>
                                <p className="text-sm font-medium text-slate-700">{fix.name}</p>
                                <p className="text-[10px] text-slate-400 uppercase">{fix.category === 'essentials' ? 'Necessidade' : 'Lazer'}</p>
                              </div>
                           </div>
                           <span className="text-sm font-semibold text-slate-600">{fix.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <p className="px-5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100/50 sticky top-0 backdrop-blur-sm z-10 border-b border-slate-100">Variáveis do Mês</p>
                    {monthTransactions.length === 0 ? (
                       <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                         <div className="p-3 bg-slate-50 rounded-full"><CheckCircle2 size={24} className="text-slate-300"/></div>
                         <p>Nenhum gasto variável registrado neste mês.</p>
                       </div>
                    ) : (
                      monthTransactions.map(t => (
                        <div key={t.id} className="px-5 py-3 flex justify-between items-center border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                           <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${t.category === 'investments' ? 'bg-emerald-500' : t.category === 'lifestyle' ? 'bg-rose-500' : 'bg-blue-500'}`}></div>
                              <div>
                                <p className="text-sm font-medium text-slate-700">{t.description}</p>
                                <p className="text-[10px] text-slate-400 uppercase">
                                   {new Date(t.dateISO).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})} • {t.category}
                                </p>
                              </div>
                           </div>
                           <div className="flex items-center gap-3">
                             <span className={`text-sm font-bold ${t.category === 'investments' ? 'text-emerald-600' : 'text-slate-700'}`}>{t.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                             <button onClick={() => deleteTransaction(t.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                           </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}



