import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, ShieldCheck, Key, RefreshCw, CreditCard, Activity, Copy, Check, Loader2, Phone, Download, Edit3, Save, LogOut, Menu, X, Smartphone, CreditCard as CardIcon, ArrowLeft, FileText, Trash2, Plus, Eye, EyeOff, Calendar } from 'lucide-react';
import { getSupabase } from '../supabase';
import { useNotifications } from './Toast';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('metrics');
  const [user, setUser] = useState(null);
  const [usage, setUsage] = useState({ requests_used: 0, requests_cap: 6000, tokens_used: 0, plan: 'free', history: [0,0,0,0,0,0,0] });
  
  // API Key States
  // API Key States
  const [apiKeys, setApiKeys] = useState([]);
  const [showNewKeyModal, setShowNewKeyModal] = useState(null);
  const [keyName, setKeyName] = useState('New Project Key');
  const [keyTokenLimit, setKeyTokenLimit] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  
  const [showPaymentModal, setShowPaymentModal] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('mobile'); 
  const [phone, setPhone] = useState('');
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigate = useNavigate();
  const { showNotification, confirmAction } = useNotifications();

  useEffect(() => {
    const checkUser = async () => {
      console.log("Checking session...");
      const supabase = await getSupabase();
      if (!supabase) return navigate('/login');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        fetchDashboardData(session);
      } else {
        navigate('/login');
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') navigate('/login');
      });
      return () => subscription.unsubscribe();
    };
    checkUser();
  }, []);

  const fetchDashboardData = async (session) => {
    try {
      const token = session.access_token;
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [usageData, keysData, payData] = await Promise.all([
        fetch('/me/usage', { headers }).then(res => res.ok ? res.json() : null).catch(() => null),
        fetch('/me/keys', { headers }).then(res => res.ok ? res.json() : null).catch(() => null),
        fetch('/me/payments', { headers }).then(res => res.ok ? res.json() : []).catch(() => [])
      ]);

      if (usageData) setUsage({ ...usage, ...usageData });
      if (keysData) setApiKeys(keysData.keys || []);
      setPayments(Array.isArray(payData) ? payData : []);
      setLoading(false);
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
      setLoading(false);
    }
  };

  const createNewKey = async (e) => {
    if (e) e.preventDefault();
    setRegenerating(true);
    try {
        const supabase = await getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        
        const payload = { name: keyName };
        if (keyTokenLimit && parseInt(keyTokenLimit) > 0) {
            payload.token_limit = parseInt(keyTokenLimit);
        }
        const res = await fetch('/register', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${session.access_token}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if (data.api_key) {
            setShowNewKeyModal(data.api_key);
            fetchDashboardData(session);
            showNotification("Key created successfully", "success");
            setKeyName('New Project Key');
            setKeyTokenLimit('');
        } else {
            showNotification(data.message || "Failed to create key", "error");
        }
    } catch (err) {
        showNotification("Failed to create key", "error");
    } finally {
        setRegenerating(false);
        setIsCreating(false);
    }
  };

  const deleteKey = async (keyId) => {
    confirmAction({
      title: "Delete API Key?",
      message: "Applications using this key will stop working immediately.",
      onConfirm: async () => {
        try {
          const supabase = await getSupabase();
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch(`/me/keys/${keyId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
          if (res.ok) {
            showNotification("Key deleted", "success");
            fetchDashboardData(session);
          }
        } catch (err) {
          showNotification("Delete failed", "error");
        }
      }
    });
  };



  const updateKeyName = async () => {
    setIsEditingName(false);
    setShowRenameModal(false);
    try {
      const supabase = await getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/me/keys/update-name', {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: keyName })
      });
      if (res.ok) {
        showNotification("Key name updated", "success");
        fetchDashboardData(session);
      } else {
        showNotification("Failed to update name", "error");
      }
    } catch (err) {
      showNotification("Failed to update name", "error");
    }
  };

  const handlePayment = async (plan) => {
    if (paymentMethod === 'mobile' && !phone) return showNotification("Please enter mobile number", "error");
    
    setPaying(true);
    try {
      if (paymentMethod === 'mobile') {
        const supabase = await getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/payments/stk-push', {
            method: 'POST',
            headers: { 
            'Authorization': `Bearer ${session.access_token}`, 
            'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone, plan })
        });
        const data = await res.json();
        if (data.checkout_id) {
            showNotification("STK Push sent to your phone!", "success");
            setShowPaymentModal(null);
        }
      } else {
          showNotification("Card gateway under maintenance", "info");
      }
    } catch (err) {
      showNotification("Payment service unavailable", "error");
    } finally {
      setPaying(false);
    }
  };

  const downloadReceipt = (paymentId) => {
    getSupabase().then(supabase => {
        supabase.auth.getSession().then(({data}) => {
            window.open(`/payments/${paymentId}/receipt?token=${data.session.access_token}`, '_blank');
        });
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showNotification("Copied to clipboard", "success");
  };

  const handleSignOut = async () => {
    const supabase = await getSupabase();
    if (supabase) await supabase.auth.signOut();
    navigate('/login');
  };
  
  const toggleMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-[#050505]">
      <div className="relative">
          <div className="w-16 h-16 border-4 border-white/5 border-t-brand-cyan rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-brand-cyan rounded-full animate-pulse"></div>
          </div>
      </div>
    </div>
  );

  const getPlanPrice = (planName) => {
      if(planName === 'Starter') return 300;
      if(planName === 'Builder') return 800;
      if(planName === 'Pro') return 1800;
      return 0;
  }

  const maxVal = Math.max(...(usage.history || [0]), 10);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#050505] text-gray-100">
      
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-6 border-b border-white/5 bg-black/80 backdrop-blur-xl z-50 sticky top-0">
        <Link to="/"><img src="/logo.png" alt="Logo" className="h-10 object-contain" /></Link>
        <button className="text-white" onClick={toggleMenu}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`w-full lg:w-72 border-r border-white/5 flex flex-col lg:h-screen lg:fixed bg-[#050505] z-40 transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0 pt-20' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="hidden lg:flex items-center p-10 mb-4">
            <Link to="/"><img src="/logo.png" alt="Applied Intelligence" className="h-12 object-contain" /></Link>
        </div>

        <nav className="flex flex-col gap-2 px-6 flex-1">
            <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-500 hover:text-white hover:bg-white/5 transition-all">
                <ArrowLeft size={18} /> Back to Home
            </Link>
            <div className="h-px bg-white/5 my-4 mx-4"></div>
            
            <button className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'metrics' ? 'bg-white/5 text-brand-cyan' : 'text-gray-500 hover:text-white hover:bg-white/5'}`} onClick={() => { setActiveTab('metrics'); setMobileMenuOpen(false); }}>
                <Activity size={18} /> Usage
            </button>
            <button className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'keys' ? 'bg-white/5 text-brand-cyan' : 'text-gray-500 hover:text-white hover:bg-white/5'}`} onClick={() => { setActiveTab('keys'); setMobileMenuOpen(false); }}>
                <Key size={18} /> Keys
            </button>
            <button className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'billing' ? 'bg-white/5 text-brand-cyan' : 'text-gray-500 hover:text-white hover:bg-white/5'}`} onClick={() => { setActiveTab('billing'); setMobileMenuOpen(false); }}>
                <CreditCard size={18} /> Billing
            </button>
            <Link to="/docs" target="_blank" className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-black uppercase tracking-widest text-gray-500 hover:text-white hover:bg-white/5 transition-all">
                <FileText size={18} /> Docs
            </Link>
        </nav>

        <div className="p-8 border-t border-white/5 mt-auto bg-white/[0.01]">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center font-black text-white shadow-lg">
                    {user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="overflow-hidden">
                    <div className="text-sm font-black truncate text-white">{user?.email}</div>
                    <div className="text-[10px] text-brand-cyan uppercase font-black tracking-[0.2em]">{usage?.plan} plan</div>
                </div>
            </div>
            <button className="flex items-center gap-3 px-4 py-3 w-full text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 rounded-xl transition-all" onClick={handleSignOut}>
                <LogOut size={18} /> Sign Out
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 flex-1 p-8 lg:p-16 xl:p-24 relative min-h-screen">
        <div className="relative z-10 max-w-6xl mx-auto">
            
            {activeTab === 'metrics' && (
            <div className="space-y-16">
                <header>
                    <h1 className="text-4xl lg:text-7xl font-black text-white mb-4 tracking-tighter">Overview</h1>
                    <p className="text-gray-500 text-lg font-medium leading-relaxed">Monitor your API performance and consumption in real-time.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                        <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-6">Total Requests</div>
                        <div className="text-6xl font-black text-white mb-8 group-hover:scale-105 transition-transform origin-left tracking-tighter">{(usage?.requests_used || 0).toLocaleString()}</div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-cyan transition-all duration-1000" style={{ width: `${Math.min(100, (usage.requests_used / (usage.requests_cap || 1)) * 100)}%` }}></div>
                        </div>
                        <div className="flex justify-between mt-4 text-[10px] font-black text-gray-600 tracking-widest uppercase">
                            <span>USAGE: {Math.round((usage.requests_used / (usage.requests_cap || 1)) * 100)}%</span>
                            <span>LIMIT: {(usage.requests_cap || 6000).toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[2.5rem] md:col-span-2 shadow-2xl">
                        <div className="flex justify-between items-center mb-10">
                            <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Inference History (7 Days)</div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2 text-[10px] text-gray-600 font-black uppercase tracking-widest"><div className="w-2.5 h-2.5 bg-brand-cyan rounded-full shadow-[0_0_8px_rgba(0,210,255,0.5)]"></div> Requests</div>
                            </div>
                        </div>
                        <div className="h-40 flex items-end gap-3 px-2">
                            {(usage.history || [0,0,0,0,0,0,0]).map((val, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-3 group relative">
                                    <motion.div 
                                        initial={{ height: 0 }}
                                        animate={{ height: `${(val / (maxVal || 1)) * 100}%` }}
                                        className="w-full bg-gradient-to-t from-brand-cyan/20 to-brand-cyan rounded-t-lg relative"
                                    >
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent)]"></div>
                                    </motion.div>
                                    <div className="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none scale-90 group-hover:scale-100 origin-bottom duration-300">
                                        <div className="bg-white text-black text-[10px] font-black px-3 py-1.5 rounded-lg shadow-2xl whitespace-nowrap">{val} reqs</div>
                                    </div>
                                    <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest">D{i+1}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl">
                        <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-8">Tokens Consumed</div>
                        <div className="text-5xl font-black text-brand-cyan mb-4 tracking-tighter">{(usage?.tokens_used || 0).toLocaleString()}</div>
                        <p className="text-xs text-gray-600 leading-relaxed font-bold uppercase tracking-wide">Monthly aggregated consumption</p>
                    </div>
                    <div className="lg:col-span-2 bg-[#0a0a0a] border border-white/5 p-10 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-16 shadow-2xl relative overflow-hidden">
                        <div className="flex-1 relative z-10">
                            <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Start Building</h3>
                            <p className="text-gray-500 mb-10 leading-relaxed font-medium">Install our client and make your first request in under 60 seconds.</p>
                            <div className="flex gap-6">
                                <Link to="/docs" className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all">Documentation</Link>
                                <button onClick={() => setActiveTab('keys')} className="px-8 py-3 bg-brand-cyan/10 text-brand-cyan rounded-full text-[10px] font-black uppercase tracking-widest transition-all">Get Key</button>
                            </div>
                        </div>
                        <div className="w-full md:w-80 aspect-video bg-black rounded-3xl border border-white/10 p-6 font-mono text-[10px] text-gray-400 shadow-inner overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-brand-cyan/20"></div>
                            <span className="text-brand-cyan">pip install</span> applied-intelligence<br/><br/>
                            <span className="text-gray-500">import applied_intelligence as ai</span><br/>
                            <span className="text-gray-500">client = ai.Client(key="...")</span><br/>
                            <span className="text-gray-500">res = client.chat.create(...)</span>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {activeTab === 'keys' && (
            <div className="space-y-16">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                    <div>
                        <h1 className="text-4xl lg:text-7xl font-black text-white mb-4 tracking-tighter">API Keys</h1>
                        <p className="text-gray-500 text-lg font-medium">Keys used to authenticate your requests to our infrastructure.</p>
                    </div>
                    {!isCreating ? (
                        <button 
                            type="button"
                            onClick={() => setIsCreating(true)} 
                            disabled={regenerating} 
                            className="px-10 py-4 bg-white text-black rounded-full font-black text-sm flex items-center gap-3 hover:bg-brand-cyan hover:scale-105 transition-all shadow-2xl shadow-white/5 active:scale-95"
                        >
                            {regenerating ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />} Create New Key
                        </button>
                    ) : (
                        <div className="flex flex-col gap-3 bg-[#0a0a0a] p-4 rounded-3xl border border-white/10 shadow-2xl min-w-[380px]">
                            <input 
                                type="text"
                                value={keyName}
                                onChange={(e) => setKeyName(e.target.value)}
                                placeholder="Key name..."
                                className="bg-white/5 border border-white/10 rounded-2xl py-3 px-5 text-white font-bold outline-none focus:border-brand-cyan transition-all placeholder:text-gray-600"
                                autoFocus
                            />
                            <div className="flex items-center gap-3">
                                <input 
                                    type="number"
                                    value={keyTokenLimit}
                                    onChange={(e) => setKeyTokenLimit(e.target.value)}
                                    placeholder="Token limit (optional)"
                                    min="1"
                                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-3 px-5 text-white font-bold outline-none focus:border-brand-cyan transition-all placeholder:text-gray-600 text-sm"
                                />
                                <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest whitespace-nowrap">tokens</span>
                            </div>
                            <p className="text-[10px] text-gray-600 px-1">Leave blank to use your full plan budget. Set a limit to cap this key's spend.</p>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => { setIsCreating(false); setKeyTokenLimit(''); }}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={(e) => createNewKey(e)}
                                    disabled={regenerating}
                                    className="flex-[2] py-3 bg-brand-cyan text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                                >
                                    {regenerating ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Generate Key"}
                                </button>
                            </div>
                        </div>
                    )}
                </header>

                <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/[0.02] border-b border-white/5">
                            <tr className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                <th className="px-10 py-6">Name</th>
                                <th className="px-10 py-6">Key</th>
                                <th className="px-10 py-6">Budget</th>
                                <th className="px-10 py-6">Status</th>
                                <th className="px-10 py-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {apiKeys.length > 0 ? apiKeys.map(key => (
                                <tr key={key.id} className="hover:bg-white/[0.01] transition-all group">
                                    <td className="px-10 py-8">
                                        <span className="font-black text-white tracking-tight text-lg">{key.name}</span>
                                    </td>
                                    <td className="px-10 py-8">
                                        <code className="text-xs font-mono text-gray-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                            {key.prefix}••••••••
                                        </code>
                                    </td>
                                    <td className="px-10 py-8">
                                        {key.token_limit ? (
                                            <div className="space-y-1.5 min-w-[140px]">
                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                    <span className="text-gray-500">{(key.tokens_consumed || 0).toLocaleString()}</span>
                                                    <span className="text-gray-600">{key.token_limit.toLocaleString()}</span>
                                                </div>
                                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all ${
                                                            (key.tokens_consumed / key.token_limit) > 0.85 
                                                                ? 'bg-red-500' 
                                                                : (key.tokens_consumed / key.token_limit) > 0.6 
                                                                    ? 'bg-yellow-400' 
                                                                    : 'bg-brand-cyan'
                                                        }`}
                                                        style={{ width: `${Math.min(100, Math.round((key.tokens_consumed / key.token_limit) * 100))}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Plan limit</span>
                                        )}
                                    </td>
                                    <td className="px-10 py-8">
                                        {key.budget_exhausted 
                                            ? <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-black text-red-400 uppercase tracking-widest">Exhausted</span>
                                            : <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-black text-green-400 uppercase tracking-widest">Active</span>
                                        }
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => copyToClipboard(key.full_key)} 
                                                className="p-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl transition-all shadow-inner"
                                                title="Copy API Key"
                                            >
                                                <Copy size={18} />
                                            </button>
                                            <button 
                                                onClick={() => deleteKey(key.id)} 
                                                className="p-3 bg-red-500/5 hover:bg-red-500/15 text-red-500/40 hover:text-red-500 rounded-2xl transition-all group/del shadow-inner"
                                                title="Delete API Key"
                                            >
                                                <Trash2 size={18} className="group-hover/del:scale-110 transition-transform" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="px-10 py-32 text-center">
                                        <div className="max-w-xs mx-auto">
                                            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center text-gray-700 mx-auto mb-8 shadow-inner"><Key size={36}/></div>
                                            <h3 className="font-black text-white text-xl mb-2 tracking-tight">No API keys found</h3>
                                            <p className="text-sm text-gray-600 mb-8 font-medium">Create an API key to start making requests to Applied Intelligence.</p>
                                            {!isCreating ? (
                                                <button 
                                                    onClick={() => setIsCreating(true)} 
                                                    className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    Create New Key
                                                </button>
                                            ) : (
                                                <div className="space-y-3">
                                                    <input 
                                                        type="text"
                                                        value={keyName}
                                                        onChange={(e) => setKeyName(e.target.value)}
                                                        placeholder="Key name..."
                                                        className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 px-6 text-white text-center font-bold outline-none focus:border-brand-cyan transition-all"
                                                        autoFocus
                                                    />
                                                    <input
                                                        type="number"
                                                        value={keyTokenLimit}
                                                        onChange={(e) => setKeyTokenLimit(e.target.value)}
                                                        placeholder="Token limit (optional)"
                                                        min="1"
                                                        className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 px-6 text-white text-center font-bold outline-none focus:border-brand-cyan transition-all placeholder:text-gray-600"
                                                    />
                                                    <p className="text-[10px] text-gray-600">Leave blank to use your full plan budget.</p>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => { setIsCreating(false); setKeyTokenLimit(''); }}
                                                            className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                        >
                                                            Back
                                                        </button>
                                                        <button 
                                                            onClick={createNewKey}
                                                            disabled={regenerating}
                                                            className="flex-[2] py-4 bg-brand-cyan text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02]"
                                                        >
                                                            {regenerating ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Generate"}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-10 bg-brand-cyan/5 border border-brand-cyan/10 rounded-[2.5rem] flex gap-8 items-start shadow-xl">
                    <div className="p-4 bg-brand-cyan/10 rounded-2xl text-brand-cyan shadow-inner"><ShieldCheck size={28}/></div>
                    <div>
                        <h4 className="font-black text-brand-cyan text-lg mb-2 tracking-tight">Security Best Practices</h4>
                        <p className="text-sm text-gray-500 leading-relaxed max-w-3xl font-medium">
                            Your API keys carry significant privileges. Never share them in client-side code or public repositories. If you suspect a key has been compromised, regenerate it immediately.
                        </p>
                    </div>
                </div>
            </div>
            )}

            {activeTab === 'billing' && (
            <div className="space-y-16">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                    <div>
                        <h1 className="text-4xl lg:text-7xl font-black text-white mb-4 tracking-tighter">Billing</h1>
                        <p className="text-gray-500 text-lg font-medium">Manage your subscription, view history, and pay via M-Pesa.</p>
                    </div>
                    <div className="px-8 py-4 bg-white/5 border border-white/5 rounded-3xl shadow-xl">
                        <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Current Tier</div>
                        <div className="text-2xl font-black text-brand-cyan capitalize tracking-tight">{usage?.plan}</div>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { name: 'Starter', price: '300', features: ['6M Tokens', '30K TPM', '30 RPM'] },
                        { name: 'Builder', price: '800', features: ['18M Tokens', '60K TPM', '60 RPM'] },
                        { name: 'Pro', price: '1800', features: ['38M Tokens', '100K TPM', '120 RPM'] }
                    ].map(p => (
                        <div key={p.name} className={`p-10 rounded-[3rem] border transition-all relative overflow-hidden ${usage.plan.toLowerCase() === p.name.toLowerCase() ? 'bg-black border-brand-cyan shadow-2xl shadow-brand-cyan/10 scale-[1.02]' : 'bg-[#0a0a0a] border-white/5 hover:border-white/20'}`}>
                            {usage.plan.toLowerCase() === p.name.toLowerCase() && <div className="absolute top-0 right-0 px-6 py-2 bg-brand-cyan text-black text-[10px] font-black uppercase tracking-widest rounded-bl-3xl shadow-lg">Active</div>}
                            <h3 className="font-black text-white text-2xl mb-2 tracking-tight">{p.name}</h3>
                            <div className="text-4xl font-black text-white mb-10 tracking-tighter">KSh {p.price}<span className="text-xs text-gray-600 font-black uppercase tracking-widest ml-1"> /mo</span></div>
                            <ul className="space-y-5 mb-12">
                                {p.features.map(f => <li key={f} className="text-sm text-gray-400 flex items-center gap-3 font-medium"><Check size={18} className="text-brand-cyan"/> {f}</li>)}
                            </ul>
                            <button 
                                onClick={() => setShowPaymentModal(p.name)}
                                disabled={usage.plan.toLowerCase() === p.name.toLowerCase()}
                                className={`w-full py-4 rounded-full text-xs font-black uppercase tracking-widest transition-all ${usage.plan.toLowerCase() === p.name.toLowerCase() ? 'bg-white/5 text-gray-700 cursor-not-allowed border border-white/5' : 'bg-white text-black hover:bg-brand-cyan hover:scale-[1.02] shadow-xl'}`}
                            >
                                {usage.plan.toLowerCase() === p.name.toLowerCase() ? 'Current Plan' : 'Select Plan'}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="space-y-10">
                    <h3 className="text-3xl font-black text-white tracking-tighter">Transaction History</h3>
                    <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/[0.02] border-b border-white/5 text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                <tr>
                                    <th className="px-10 py-6">Date</th>
                                    <th className="px-10 py-6">Plan</th>
                                    <th className="px-10 py-6">Amount</th>
                                    <th className="px-10 py-6">Status</th>
                                    <th className="px-10 py-6 text-right">Receipt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {payments.length > 0 ? payments.map(p => (
                                    <tr key={p.id} className="text-gray-500 hover:bg-white/[0.01] transition-all">
                                        <td className="px-10 py-6 text-xs font-mono font-bold">{new Date(p.created_at).toLocaleDateString()}</td>
                                        <td className="px-10 py-6 font-black text-white capitalize text-base tracking-tight">{p.plan}</td>
                                        <td className="px-10 py-6 font-bold">KSh {p.amount}</td>
                                        <td className="px-10 py-6">
                                            <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${p.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.1)]' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            {p.status === 'completed' && <button onClick={() => downloadReceipt(p.id)} className="p-3 hover:bg-white/5 hover:text-white rounded-xl transition-all"><Download size={18}/></button>}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="5" className="px-10 py-20 text-center text-gray-600 font-medium">No transactions found in this billing cycle.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            )}
        </div>
      </main>

      {/* New Key Created Modal */}
      <AnimatePresence>
        {showNewKeyModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/98 backdrop-blur-3xl">
                <motion.div initial={{opacity: 0, scale: 0.9, y: 30}} animate={{opacity: 1, scale: 1, y: 0}} className="bg-[#080808] border border-white/10 p-12 rounded-[3rem] max-w-2xl w-full shadow-[0_0_100px_rgba(0,210,255,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-brand shadow-[0_0_20px_rgba(0,210,255,0.5)]"></div>
                    <div className="w-20 h-20 bg-brand-cyan/10 rounded-3xl flex items-center justify-center text-brand-cyan mb-8 shadow-inner"><Key size={36}/></div>
                    <h3 className="text-3xl font-black text-white mb-4 tracking-tighter">API Key Created</h3>
                    <p className="text-gray-500 text-base mb-10 leading-relaxed font-medium">Please copy your secret key and store it in a secure password manager. For your protection, this key will never be shown again.</p>
                    
                    <div className="bg-black border border-white/5 p-6 rounded-[2rem] flex items-center justify-between mb-10 group hover:border-brand-cyan/30 transition-all shadow-inner">
                        <code className="text-brand-cyan font-mono text-base break-all selection:bg-brand-cyan selection:text-black">{showNewKeyModal}</code>
                        <button onClick={() => copyToClipboard(showNewKeyModal)} className="p-4 hover:bg-brand-cyan hover:text-black rounded-2xl transition-all text-gray-600 shrink-0 shadow-lg">
                            <Copy size={24} />
                        </button>
                    </div>

                    <button onClick={() => setShowNewKeyModal(null)} className="w-full py-5 bg-white text-black rounded-full font-black text-base hover:bg-brand-cyan hover:scale-[1.02] transition-all shadow-2xl active:scale-95">
                        I've stored it securely
                    </button>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
            <div className="fixed inset-0 z-[99] flex items-center justify-center p-8 bg-black/95 backdrop-blur-3xl">
                <motion.div initial={{opacity: 0, y: 30}} animate={{opacity: 1, y: 0}} className="bg-[#0a0a0a] border border-white/5 w-full max-w-5xl rounded-[4rem] overflow-hidden flex flex-col md:flex-row shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                    <div className="flex-[1.2] p-12 lg:p-16 bg-white/[0.01] border-r border-white/5 flex flex-col">
                        <div className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em] mb-12">Checkout Preview</div>
                        <div className="flex-1 flex flex-col justify-center">
                            <div className="flex justify-between items-end mb-12">
                                <div>
                                    <div className="text-4xl font-black text-white tracking-tighter mb-2">{showPaymentModal} Plan</div>
                                    <div className="text-sm text-gray-600 font-bold uppercase tracking-widest">Monthly Subscription</div>
                                </div>
                                <div className="text-4xl font-black text-white tracking-tighter">KSh {getPlanPrice(showPaymentModal)}</div>
                            </div>
                            <div className="h-px bg-white/5 mb-12"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-bold text-gray-500">Total Payment Due</span>
                                <span className="text-5xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">KSh {getPlanPrice(showPaymentModal)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 p-12 lg:p-16 bg-black flex flex-col">
                        <div className="flex justify-between items-center mb-12">
                            <h3 className="text-2xl font-black text-white tracking-tight">Payment Method</h3>
                            <button onClick={() => setShowPaymentModal(null)} className="text-gray-700 hover:text-white transition-all"><X size={28}/></button>
                        </div>
                        <div className="flex gap-4 p-1.5 bg-white/[0.02] rounded-3xl mb-12 border border-white/5">
                            <button className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'mobile' ? 'bg-white text-black shadow-2xl' : 'text-gray-600 hover:text-white'}`} onClick={() => setPaymentMethod('mobile')}>M-Pesa</button>
                            <button className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'card' ? 'bg-white text-black shadow-2xl' : 'text-gray-600 hover:text-white'}`} onClick={() => setPaymentMethod('card')}>Credit Card</button>
                        </div>
                        
                        {paymentMethod === 'mobile' ? (
                            <div className="flex-1 flex flex-col justify-between">
                                <div className="space-y-8">
                                    <div>
                                        <label className="block text-[10px] text-gray-600 font-black uppercase tracking-widest mb-4 ml-2">Phone Number (STK Push)</label>
                                        <div className="relative group">
                                            <Smartphone className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-brand-cyan transition-colors" size={20} />
                                            <input className="w-full bg-black border border-white/10 rounded-2xl py-5 pl-16 pr-6 text-white font-mono text-lg focus:border-brand-cyan transition-all outline-none shadow-inner" placeholder="254..." value={phone} onChange={(e) => setPhone(e.target.value)} />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed font-medium">A payment request will be sent to your phone. Please enter your M-Pesa PIN to complete the transaction.</p>
                                </div>
                                <button onClick={() => handlePayment(showPaymentModal)} disabled={paying} className="w-full py-5 bg-brand-cyan text-black rounded-full font-black text-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-4 shadow-[0_0_40px_rgba(0,210,255,0.2)] mt-12 disabled:opacity-50">
                                    {paying ? <Loader2 className="animate-spin" size={24} /> : `Confirm & Pay`}
                                </button>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                                <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center text-gray-800 mb-8"><CardIcon size={48} /></div>
                                <h4 className="text-white font-black mb-2">Card Payments</h4>
                                <p className="text-xs text-gray-600 leading-relaxed max-w-xs mx-auto">This payment gateway is currently under maintenance. Please use M-Pesa for immediate access.</p>
                                <button onClick={() => setPaymentMethod('mobile')} className="mt-8 text-[10px] font-black uppercase tracking-[0.2em] text-brand-cyan hover:text-white transition-all underline">Use M-Pesa Instead</button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* Rename Modal */}
      <AnimatePresence>
        {showRenameModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/95 backdrop-blur-3xl">
                <motion.div initial={{opacity: 0, scale: 0.95}} animate={{opacity: 1, scale: 1}} className="bg-[#0a0a0a] border border-white/10 p-12 rounded-[3rem] max-w-lg w-full shadow-2xl">
                    <h3 className="text-2xl font-black text-white mb-2 tracking-tighter">Rename API Key</h3>
                    <p className="text-gray-500 text-sm mb-8 font-medium">Give your key a descriptive name to help you identify it later.</p>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] text-gray-600 font-black uppercase tracking-widest mb-3 ml-1">New Key Name</label>
                            <input 
                                type="text"
                                value={keyName}
                                onChange={(e) => setKeyName(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-brand-cyan transition-all shadow-inner"
                                autoFocus
                            />
                        </div>
                        
                        <div className="flex gap-3 pt-4">
                            <button onClick={() => setShowRenameModal(false)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-gray-500 rounded-full text-[10px] font-black uppercase tracking-widest transition-all">Cancel</button>
                            <button onClick={updateKeyName} className="flex-[2] py-4 bg-brand-cyan text-black rounded-full text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02]">Update Name</button>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

    </div>
  );
}
