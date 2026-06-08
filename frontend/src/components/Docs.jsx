import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Search, Code, Terminal, Book, Cpu, Key,
  Globe, Zap, ShieldCheck, Copy, Check, ChevronRight,
  ExternalLink, Layers, MessageSquare, Play
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSupabase } from '../supabase';

export default function Docs() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = await getSupabase();
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkUser();
  }, []);

  const sections = [
    { id: 'getting-started', label: 'Getting Started', icon: Play },
    { id: 'authentication', label: 'Authentication', icon: ShieldCheck },
    { id: 'chat-completions', label: 'Chat Completions', icon: MessageSquare },
    { id: 'models', label: 'Model Directory', icon: Cpu },
    { id: 'rate-limits', label: 'Rate Limits', icon: Zap },
    { id: 'errors', label: 'Error Handling', icon: Layers },
  ];

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#020408] selection:bg-brand-cyan/30 flex flex-col lg:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-80 bg-[#05070a] border-r border-white/5 flex flex-col h-screen sticky top-0 z-50">
        <div className="p-10">
            <div className="flex items-center gap-3 mb-10 group cursor-pointer" onClick={() => navigate('/')}>
                <img src="/logo.png" alt="Logo" className="h-10 object-contain group-hover:scale-105 transition-transform" />
                <div className="h-4 w-px bg-white/10"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 group-hover:text-white transition-colors">Docs</span>
            </div>

            <div className="relative group mb-10">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-brand-cyan transition-colors" size={16} />
                <input 
                    type="text" 
                    placeholder="Search docs..." 
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-xs font-medium focus:border-brand-cyan outline-none transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <nav className="space-y-1">
                {sections.map((section) => (
                    <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left transition-all group ${activeSection === section.id ? 'bg-white/5 text-brand-cyan border border-white/5' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <div className="flex items-center gap-3">
                            <section.icon size={18} />
                            <span className="text-xs font-black uppercase tracking-widest">{section.label}</span>
                        </div>
                        <ChevronRight size={14} className={`transition-transform ${activeSection === section.id ? 'rotate-90 text-brand-cyan' : 'opacity-0 group-hover:opacity-100'}`} />
                    </button>
                ))}
            </nav>
        </div>

        <div className="mt-auto p-8 border-t border-white/5 bg-white/[0.01]">
            <a href="/starter-kit.zip" download className="flex items-center gap-3 px-4 py-3 w-full bg-brand-cyan text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all justify-center">
                Download SDK
            </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen bg-[#020408] relative overflow-x-hidden">
        
        {/* Top Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 md:px-20 sticky top-0 bg-[#020408]/80 backdrop-blur-xl z-40">
            <div className="flex items-center gap-3">
                <Book size={18} className="text-brand-cyan" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Documentation / <span className="text-white capitalize">{activeSection.replace('-', ' ')}</span></span>
            </div>
            <div className="flex items-center gap-6">
                <a href="#" className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-2">
                    GitHub <ExternalLink size={14} />
                </a>
                <button onClick={() => navigate(user ? "/dashboard" : "/login")} className="px-5 py-2 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-brand-cyan transition-all">
                    {user ? "Dashboard" : "Log In"}
                </button>
            </div>
        </header>

        <div className="max-w-4xl mx-auto px-10 py-20 md:px-20 md:py-32">
            <AnimatePresence mode="wait">
                {activeSection === 'getting-started' && (
                    <motion.div key="getting-started" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <h1 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter">Getting Started</h1>
                        <p className="text-xl text-gray-400 mb-12 leading-relaxed font-medium">Welcome to Africa's most advanced applied intelligence infrastructure. This guide will help you integrate our frontier models into your applications.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                            <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 hover:border-brand-cyan/20 transition-all group">
                                <Terminal className="text-brand-cyan mb-6" size={32} />
                                <h3 className="text-xl font-black text-white mb-3">Quick Install</h3>
                                <p className="text-sm text-gray-500 mb-6 font-medium">Install our official Python SDK via pip to get started immediately.</p>
                                <div className="bg-black/60 rounded-xl p-4 font-mono text-xs text-brand-cyan border border-white/5 flex justify-between items-center group-hover:border-brand-cyan/30">
                                    <span>pip install applied-intelligence</span>
                                    <button onClick={() => copyToClipboard('pip install applied-intelligence')} className="text-gray-700 hover:text-white transition-colors"><Copy size={14} /></button>
                                </div>
                            </div>
                            <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 hover:border-brand-cyan/20 transition-all group">
                                <Key className="text-brand-cyan mb-6" size={32} />
                                <h3 className="text-xl font-black text-white mb-3">API Keys</h3>
                                <p className="text-sm text-gray-500 mb-6 font-medium">Generate your secure access keys in the Developer Console.</p>
                                <button onClick={() => navigate('/login')} className="text-[10px] font-black uppercase tracking-widest text-brand-cyan hover:text-white transition-colors">Go to Console →</button>
                            </div>
                        </div>

                        <h2 className="text-3xl font-black text-white mb-8 tracking-tight">Basic Usage</h2>
                        <div className="bg-[#080808] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl mb-12">
                            <div className="bg-white/[0.02] px-6 py-4 border-b border-white/5 flex justify-between items-center">
                                <div className="flex gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20"></div>
                                </div>
                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">example.py</span>
                            </div>
                            <pre className="p-8 text-xs md:text-sm font-mono text-gray-400 leading-relaxed overflow-x-auto">
                                <span className="text-brand-purple">import</span> applied_intelligence <span className="text-brand-purple">as</span> ai<br/><br/>
                                client = ai.Client(api_key=<span className="text-emerald-400">"YOUR_KEY"</span>)<br/><br/>
                                response = client.chat.completions.create(<br/>
                                &nbsp;&nbsp;model=<span className="text-emerald-400">"frontier-model"</span>,<br/>
                                &nbsp;&nbsp;messages=[&#123;<span className="text-emerald-400">"role"</span>: <span className="text-emerald-400">"user"</span>, <span className="text-emerald-400">"content"</span>: <span className="text-emerald-400">"Hello!"</span>&#125;]<br/>
                                )<br/><br/>
                                <span className="text-brand-purple">print</span>(response.choices[0].message.content)
                            </pre>
                        </div>
                    </motion.div>
                )}

                {activeSection === 'authentication' && (
                    <motion.div key="authentication" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <h1 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter">Authentication</h1>
                        <p className="text-xl text-gray-400 mb-12 leading-relaxed font-medium">Our API uses API Keys to authenticate requests. You can view and manage your keys in the console.</p>
                        
                        <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 mb-12">
                            <h3 className="text-xl font-black text-white mb-6">Header Specification</h3>
                            <p className="text-sm text-gray-500 mb-8 font-medium">All API requests must include your API Key in the <code className="text-brand-cyan bg-white/5 px-2 py-0.5 rounded">Authorization</code> HTTP header.</p>
                            <div className="bg-black/60 rounded-2xl p-6 font-mono text-sm text-gray-400 border border-white/5">
                                <span className="text-brand-cyan">Authorization:</span> Bearer <span className="text-emerald-400">AI_PLATFORM_KEY</span>
                            </div>
                        </div>

                        <div className="flex items-start gap-6 p-8 rounded-[2.5rem] bg-amber-500/5 border border-amber-500/10">
                            <ShieldCheck className="text-amber-500 shrink-0" size={24} />
                            <div>
                                <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2">Security Best Practices</h4>
                                <p className="text-xs text-gray-500 leading-relaxed font-medium">Never share your API keys or expose them in client-side code (browsers, mobile apps). Always perform API calls from a secure server-side environment.</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Other sections would follow similar premium patterns... */}
                {activeSection !== 'getting-started' && activeSection !== 'authentication' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-40 text-center">
                        <Code className="text-white/5 mb-8" size={80} />
                        <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Technical Spec Incoming</h2>
                        <p className="text-gray-500 max-w-sm font-medium">Detailed documentation for {activeSection.replace('-', ' ')} is being synchronized with our latest frontier update.</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </main>

      {/* Decorative Glows */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-brand-cyan/5 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-brand-purple/5 blur-[120px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/2"></div>
    </div>
  );
}
