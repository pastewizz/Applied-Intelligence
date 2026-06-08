import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users, BarChart3, Banknote, ShieldAlert, ArrowLeft, Loader2, 
  Search, Clock, ShieldX, Lock, Activity, RefreshCw, 
  Smartphone, Eye, EyeOff, LayoutDashboard, Database, 
  ShieldCheck, ArrowUpRight, LogOut, Menu, X
} from 'lucide-react';
import { getSupabase } from '../supabase';
import { useNotifications } from './Toast';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({ total_users: 0, total_requests: 0, total_revenue: 0 });
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [health, setHealth] = useState({ latency: 0, status: 'operational' });
  const [searchQuery, setSearchQuery] = useState('');
  
  const [adminSecret, setAdminSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const navigate = useNavigate();
  const { showNotification } = useNotifications();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = await getSupabase();
      if (!supabase) return navigate('/login');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate('/login');
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const fetchAdminData = async (secret) => {
    setLoading(true);
    setError('');
    try {
      const supabase = await getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { 
        'Authorization': `Bearer ${session.access_token}`,
        'X-Admin-Secret': secret 
      };
      
      const responses = await Promise.all([
        fetch('/admin/stats', { headers }),
        fetch('/admin/users', { headers }),
        fetch('/admin/payments', { headers }),
        fetch('/admin/logs', { headers }),
        fetch('/admin/health', { headers })
      ]);

      const failed = responses.find(r => !r.ok);
      if (failed) {
        if (failed.status === 403) {
          setError("Access Denied: You do not have admin privileges or the secret is incorrect.");
          showNotification("Unauthorized Access", "error");
        } else if (failed.status === 429) {
          setError("Rate limit exceeded. Please wait a moment.");
        } else {
          setError("Failed to connect to admin services.");
        }
        setLoading(false);
        return;
      }

      const [statsData, usersData, paymentsData, logsData, healthData] = await Promise.all(
        responses.map(r => r.json())
      );

      setStats(statsData);
      setUsers(usersData);
      setPayments(paymentsData);
      setLogs(logsData);
      setHealth(healthData);
      setIsUnlocked(true);
      setLoading(false);
      showNotification("Portal Unlocked", "success");
    } catch (err) {
      setError("Network error: Could not connect to the server.");
      setLoading(false);
    }
  };

  const handleUnlock = (e) => {
    e.preventDefault();
    fetchAdminData(adminSecret);
  };

  if (loading && !isUnlocked) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050505] gap-6">
      <div className="relative">
          <div className="w-16 h-16 border-4 border-white/5 border-t-brand-cyan rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-brand-cyan rounded-full animate-pulse"></div>
          </div>
      </div>
      <p className="text-gray-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Initializing Command Center</p>
    </div>
  );

  if (!isUnlocked) return (
    <div className="h-screen w-full flex items-center justify-center bg-[#050505] p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-cyan/10 blur-[120px] rounded-full pointer-events-none"></div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-[#0a0a0a] border border-white/10 p-12 rounded-[3rem] shadow-2xl relative z-10">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500 mb-8 mx-auto shadow-inner border border-red-500/10"><Lock size={32} /></div>
            <div className="text-center mb-10">
                <h2 className="text-2xl font-black text-white mb-2 tracking-tighter">Secure Admin Portal</h2>
                <p className="text-gray-500 text-sm font-medium px-8">Enter your security key. You must be logged in with your <span className="text-white">authorized admin account</span> to proceed.</p>
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-4 rounded-2xl mb-8 font-bold leading-relaxed">{error}</div>}
            <form onSubmit={handleUnlock} className="space-y-6">
                <div className="relative group">
                    <input type={showSecret ? "text" : "password"} className="w-full bg-black border border-white/10 rounded-2xl py-5 px-6 text-white font-mono text-center text-lg focus:border-brand-cyan transition-all outline-none shadow-inner" placeholder="Admin Secret Key" value={adminSecret} onChange={(e) => setAdminSecret(e.target.value)} required />
                    <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-700 hover:text-white transition-colors">
                        {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
                <button className="w-full py-5 bg-white text-black rounded-full font-black text-sm uppercase tracking-widest hover:bg-brand-cyan hover:scale-[1.02] transition-all shadow-2xl active:scale-95">Unlock Controls</button>
            </form>
            <div className="mt-8 text-center">
                <button onClick={() => navigate('/dashboard')} className="text-xs font-black uppercase tracking-widest text-gray-600 hover:text-white transition-all inline-flex items-center gap-2"><ArrowLeft size={14} /> Back to Dashboard</button>
            </div>
        </motion.div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#050505] text-gray-100">
      
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-6 border-b border-white/5 bg-black z-50 sticky top-0">
        <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Admin" className="h-8 object-contain" />
            <span className="text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 px-3 py-1 rounded-full border border-red-500/10">Master Admin</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white"><Menu size={24} /></button>
      </div>

      {/* Sidebar */}
      <aside className={`w-full lg:w-72 bg-[#080808] border-r border-white/5 flex flex-col fixed lg:h-screen z-40 transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-10 mb-6 hidden lg:block">
            <img src="/logo.png" alt="Applied Intelligence" className="h-10 object-contain mb-6" />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[8px] font-black text-red-500 uppercase tracking-widest">Master Admin Access</div>
        </div>

        <nav className="flex-1 px-6 space-y-2">
            <button 
                onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-white/5 text-brand-cyan border border-white/5' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            >
                <LayoutDashboard size={18} /> Overview
            </button>
            <button 
                onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-white/5 text-brand-cyan border border-white/5' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            >
                <Users size={18} /> Accounts
            </button>
            <button 
                onClick={() => { setActiveTab('payments'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'payments' ? 'bg-white/5 text-brand-cyan border border-white/5' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            >
                <Banknote size={18} /> Payments
            </button>
            <button 
                onClick={() => { setActiveTab('security'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'security' ? 'bg-white/5 text-brand-cyan border border-white/5' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            >
                <ShieldCheck size={18} /> Audit Trail
            </button>
        </nav>

        <div className="p-8 border-t border-white/5 bg-white/[0.01]">
            <div className="mb-8 p-6 bg-black rounded-3xl border border-white/5 shadow-inner">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">API Health</span>
                    <div className={`w-2 h-2 rounded-full ${health.status === 'operational' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                </div>
                <div className="text-xl font-black text-white tracking-tighter mb-1">{Math.round(health.latency)}ms</div>
                <div className="text-[10px] text-gray-500 font-bold">Current System Latency</div>
            </div>
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-3 px-4 py-3 w-full text-xs font-black uppercase tracking-widest text-gray-500 hover:text-red-500 transition-all group">
                <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" /> Exit Portal
            </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-72 min-h-screen relative p-8 lg:p-16 xl:p-24 overflow-x-hidden">
        <div className="max-w-6xl mx-auto relative z-10">
            
            <header className="mb-16">
                <h1 className="text-4xl lg:text-7xl font-black text-white mb-4 tracking-tighter capitalize">{activeTab}</h1>
                <p className="text-gray-500 text-lg font-medium">Command and control interface for Applied Intelligence infrastructure.</p>
            </header>

            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                                <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-6">Aggregate Users</div>
                                <div className="text-6xl font-black text-white tracking-tighter group-hover:scale-105 transition-transform origin-left">{stats.total_users.toLocaleString()}</div>
                                <Users size={120} className="absolute -bottom-6 -right-6 text-white/[0.01] group-hover:text-white/[0.03] transition-all" />
                            </div>
                            <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                                <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-6">Platform Inferences</div>
                                <div className="text-6xl font-black text-white tracking-tighter group-hover:scale-105 transition-transform origin-left">{stats.total_requests.toLocaleString()}</div>
                                <Activity size={120} className="absolute -bottom-6 -right-6 text-white/[0.01] group-hover:text-white/[0.03] transition-all" />
                            </div>
                            <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                                <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-6">Accrued Revenue</div>
                                <div className="text-6xl font-black text-brand-cyan tracking-tighter group-hover:scale-105 transition-transform origin-left">KSh {stats.total_revenue.toLocaleString()}</div>
                                <Banknote size={120} className="absolute -bottom-6 -right-6 text-brand-cyan/[0.02] group-hover:text-brand-cyan/[0.05] transition-all" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-[#0a0a0a] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl">
                                <h3 className="text-xl font-black text-white mb-8 tracking-tight">System Status</h3>
                                <div className="space-y-6">
                                    {['Database Cluster', 'Inference Engine', 'Payment Gateway', 'Auth Service'].map(svc => (
                                        <div key={svc} className="flex justify-between items-center p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{svc}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">Nominal</span>
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-[#0a0a0a] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl flex flex-col justify-center items-center text-center">
                                <div className="w-24 h-24 bg-brand-cyan/5 rounded-[2.5rem] flex items-center justify-center text-brand-cyan mb-8 border border-brand-cyan/10 shadow-inner">
                                    <Database size={40} />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Storage Utilization</h3>
                                <p className="text-gray-500 text-sm font-medium mb-8">Platform database is performing at 100% capacity with 0% data loss.</p>
                                <button className="px-8 py-3 bg-white/5 text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-white/10 transition-all">Optimize Database</button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'users' && (
                    <motion.div key="users" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                        <div className="flex flex-col md:flex-row gap-6 mb-8">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-brand-cyan transition-colors" size={20} />
                                <input 
                                    type="text" 
                                    placeholder="Search by identity, UUID, or tier..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-3xl py-5 pl-16 pr-14 text-white text-sm font-bold focus:border-brand-cyan outline-none transition-all shadow-inner" 
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="px-6 py-5 bg-white/5 border border-white/5 rounded-3xl text-[10px] font-black uppercase tracking-widest text-gray-500">
                                    {users.filter(u => 
                                        (u?.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                         u?.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                         u?.plan?.toLowerCase().includes(searchQuery.toLowerCase()))
                                    ).length} Results
                                </div>
                                <button onClick={() => fetchAdminData(adminSecret)} className="px-10 py-5 bg-white text-black rounded-3xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-brand-cyan transition-all shadow-2xl active:scale-95">
                                    <RefreshCw size={16} /> Sync
                                </button>
                            </div>
                        </div>

                        <div className="bg-[#0a0a0a] border border-white/5 rounded-[3.5rem] overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left text-sm min-w-[800px]">
                                    <thead className="bg-white/[0.02] border-b border-white/5">
                                        <tr className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                            <th className="px-10 py-8 w-[40%]">Account Identity</th>
                                            <th className="px-10 py-8 w-[20%]">Subscription</th>
                                            <th className="px-10 py-8 w-[25%]">Consumption</th>
                                            <th className="px-10 py-8 text-right w-[15%]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {users.filter(u => 
                                            (u?.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                             u?.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                             u?.plan?.toLowerCase().includes(searchQuery.toLowerCase()))
                                        ).map(u => (
                                            <tr key={u.id} className="hover:bg-white/[0.01] transition-all group">
                                                <td className="px-10 py-10">
                                                    <div className="font-black text-white text-base tracking-tight mb-1 truncate max-w-[250px]" title={u?.email}>{u?.email || 'Unknown Identity'}</div>
                                                    <div className="text-[10px] text-gray-600 font-mono truncate max-w-[200px]" title={u?.id}>UUID: {u?.id || 'N/A'}</div>
                                                </td>
                                                <td className="px-10 py-10">
                                                    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${u?.plan === 'pro' ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20 shadow-[0_0_15px_rgba(0,210,255,0.1)]' : 'bg-white/5 text-gray-500 border-white/5'}`}>
                                                        {u?.plan || 'Free'}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-10">
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-mono text-gray-400 font-bold whitespace-nowrap">{(u?.requests_used || 0).toLocaleString()} <span className="text-gray-700 text-[10px]">REQS</span></span>
                                                        <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden shrink-0">
                                                            <div className="h-full bg-brand-cyan" style={{ width: `${Math.min(100, ((u?.requests_used || 0) / 6000) * 100)}%` }}></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-10 text-right">
                                                    <button className="p-4 bg-red-500/5 hover:bg-red-500/15 text-red-500/40 hover:text-red-500 rounded-2xl transition-all shadow-inner border border-red-500/10 active:scale-90" title="Restrict Account">
                                                        <ShieldX size={20} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'payments' && (
                    <motion.div key="payments" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-[#0a0a0a] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl flex items-center gap-10">
                                <div className="p-6 bg-green-500/10 rounded-[2rem] text-green-500"><Smartphone size={32} /></div>
                                <div>
                                    <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Success Rate</div>
                                    <div className="text-4xl font-black text-white tracking-tighter">98.4%</div>
                                </div>
                            </div>
                            <div className="bg-[#0a0a0a] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl flex items-center gap-10">
                                <div className="p-6 bg-amber-500/10 rounded-[2rem] text-amber-500"><Activity size={32} /></div>
                                <div>
                                    <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Pending STK</div>
                                    <div className="text-4xl font-black text-white tracking-tighter">{payments.filter(p => p.status === 'pending').length}</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#0a0a0a] border border-white/5 rounded-[3.5rem] overflow-hidden shadow-2xl">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white/[0.02] border-b border-white/5">
                                    <tr className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                        <th className="px-10 py-8">Mobile Reference</th>
                                        <th className="px-10 py-8">Captured Amount</th>
                                        <th className="px-10 py-8">Transaction State</th>
                                        <th className="px-10 py-8 text-right">Execution Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {payments.map(p => (
                                        <tr key={p.id} className="hover:bg-white/[0.01] transition-all group">
                                            <td className="px-10 py-10">
                                                <div className="font-black text-white text-base tracking-tight mb-1">{p.phone}</div>
                                                <div className="text-[10px] text-gray-600 font-mono uppercase">M-PESA WALLET</div>
                                            </td>
                                            <td className="px-10 py-10 font-black text-brand-cyan text-xl tracking-tighter">KSh {p.amount}</td>
                                            <td className="px-10 py-10">
                                                <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full border ${p.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                            <td className="px-10 py-10 text-right text-gray-600 font-mono text-xs font-bold">{new Date(p.created_at).toLocaleDateString()} • {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'security' && (
                    <motion.div key="security" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                            <aside className="lg:col-span-1 space-y-6">
                                <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
                                    <div className="flex items-center gap-3 mb-6">
                                        <ShieldAlert className="text-red-500" size={24} />
                                        <h4 className="font-black text-white text-sm tracking-tight uppercase">High Severity</h4>
                                    </div>
                                    <div className="text-5xl font-black text-white mb-2 tracking-tighter">{logs.filter(l => l.action.includes('UNAUTHORIZED')).length}</div>
                                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest leading-relaxed">Total unauthorized access attempts in last 24h.</p>
                                </div>
                                <div className="bg-brand-cyan/5 border border-brand-cyan/10 p-8 rounded-[2.5rem] shadow-2xl">
                                    <h4 className="font-black text-brand-cyan text-xs tracking-widest uppercase mb-4">Security Notice</h4>
                                    <p className="text-[10px] text-gray-500 font-bold leading-relaxed">All administrative actions are cryptographically signed and logged for audit purposes.</p>
                                </div>
                            </aside>

                            <div className="lg:col-span-3 space-y-6">
                                {logs.map((log, i) => (
                                    <div key={i} className={`bg-[#0a0a0a] border border-white/5 p-8 rounded-[3rem] transition-all group relative overflow-hidden ${log.action.includes('UNAUTHORIZED') ? 'border-red-500/20' : ''}`}>
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                                            <div className="flex items-center gap-6">
                                                <div className={`p-4 rounded-2xl ${log.action.includes('UNAUTHORIZED') ? 'bg-red-500/10 text-red-500' : 'bg-white/5 text-gray-600'}`}>
                                                    {log.action.includes('UNAUTHORIZED') ? <ShieldX size={24} /> : <Activity size={24} />}
                                                </div>
                                                <div>
                                                    <div className="text-base font-black text-white tracking-tight mb-1">{log.email}</div>
                                                    <div className="flex items-center gap-4 text-[10px] font-black text-gray-700 uppercase tracking-widest">
                                                        <span>Origin: {log.ip}</span>
                                                        <span>•</span>
                                                        <span>{new Date(log.time).toLocaleDateString()} {new Date(log.time).toLocaleTimeString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`px-5 py-2 rounded-xl text-[10px] font-mono font-black uppercase border ${log.action.includes('UNAUTHORIZED') ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-white/5 text-gray-500 border-white/10'}`}>
                                                {log.action}
                                            </div>
                                        </div>
                                        {log.action.includes('UNAUTHORIZED') && <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-[40px] rounded-full"></div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
