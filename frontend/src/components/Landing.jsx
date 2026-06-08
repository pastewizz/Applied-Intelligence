import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ShieldCheck, Server, ArrowRight, Database, Globe, TerminalSquare, Copy, Check, Menu, X, Code, Terminal, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import NeuralSphere from './NeuralSphere';
import { getSupabase } from '../supabase';

export default function Landing() {
  const [sysPrompt, setSysPrompt] = useState('You are a senior developer.');
  const [userPrompt, setUserPrompt] = useState('Explain how to implement a secure API rate limiter.');
  const [temp, setTemp] = useState(0.3);
  const [tokens, setTokens] = useState(250);
  const [output, setOutput] = useState('Awaiting execution...');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const handleTest = async () => {
    setLoading(true);
    setOutput('Processing request...');
    try {
        const response = await fetch('/v1/demo/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: sysPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: tokens,
                temperature: temp
            })
        });
        const data = await response.json();
        if (data.choices && data.choices[0]) {
            setOutput(data.choices[0].message.content);
        } else {
            setOutput('Error: ' + (data.detail || 'Could not reach inference engine.'));
        }
    } catch (err) {
        setOutput('Error: Connection failed.');
    } finally {
        setLoading(false);
    }
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  return (
    <div className="min-h-screen relative bg-[#050505] text-gray-100 selection:bg-brand-cyan selection:text-black">
      {/* Background Animation & Frosted Overlay */}
      <div className="fixed inset-0 z-0">
          <NeuralSphere />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"></div>
      </div>

      {/* Sticky Navigation */}
      <nav className="sticky top-0 z-[100] bg-black/60 backdrop-blur-2xl border-b border-white/5 px-6 py-4 flex justify-between items-center transition-all duration-300">
        <Link to="/" className="flex items-center group">
          <img src="/logo.png" alt="Applied Intelligence" className="h-16 md:h-24 object-contain group-hover:scale-105 transition-transform" />
        </Link>
        
        <div className="hidden md:flex gap-8 items-center text-xs font-black uppercase tracking-widest text-gray-400">
            <a href="#specs" className="hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">Platform</a>
            <a href="#playground" className="hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">API Explorer</a>
            <a href="#pricing" className="hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">Pricing</a>
            <a href="/docs" target="_blank" className="hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">Docs</a>
            <Link to={user ? "/dashboard" : "/login"} className="px-6 py-2.5 bg-white text-black rounded-full hover:bg-brand-cyan transition-all font-black shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                {user ? "Dashboard" : "Log In"}
            </Link>
        </div>

        <button className="md:hidden text-white" onClick={toggleMenu}>
          {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} className="fixed inset-0 z-[90] bg-black/95 backdrop-blur-3xl pt-24 px-10 md:hidden">
            <div className="flex flex-col gap-8 text-2xl font-black uppercase tracking-tighter">
              <a href="#specs" onClick={toggleMenu} className="hover:text-brand-cyan transition-colors">Platform</a>
              <a href="#playground" onClick={toggleMenu} className="hover:text-brand-cyan transition-colors">API Explorer</a>
              <a href="#pricing" onClick={toggleMenu} className="hover:text-brand-cyan transition-colors">Pricing</a>
              <a href="/docs" target="_blank" onClick={toggleMenu} className="hover:text-brand-cyan transition-colors">Docs</a>
              <Link to={user ? "/dashboard" : "/login"} onClick={toggleMenu} className="text-brand-cyan">
                {user ? "Dashboard" : "Log In"}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="pt-20 pb-32 px-6 text-center lg:pt-48 lg:pb-72 relative">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-[10px] font-black uppercase tracking-[0.2em] mb-10 animate-pulse">
                Professional B2B AI Proxy
            </span>
            <h1 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter leading-[0.85] text-white max-w-6xl mx-auto drop-shadow-[0_0_25px_rgba(0,210,255,0.3)]">
                ENTERPRISE AI INFRASTRUCTURE, <br/><span className="text-transparent bg-clip-text bg-gradient-brand">SIMPLIFIED.</span>
            </h1>
            <p className="text-lg md:text-2xl text-gray-400 max-w-3xl mx-auto mb-16 leading-relaxed font-medium">
                The most reliable AI API built for the African market. Get unprecedented speed, automatic failover, and intelligent query optimization through a single endpoint—all billed locally via M-Pesa.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link to={user ? "/dashboard" : "/login"} className="px-10 py-5 bg-white text-black rounded-full font-black text-lg hover:bg-brand-cyan hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 group">
                {user ? "Go to Dashboard" : "Get Started"} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#playground" className="px-10 py-5 bg-white/5 border border-white/10 text-white rounded-full font-black text-lg hover:bg-white/10 transition-all backdrop-blur-xl">
                Try API Explorer
              </a>
            </div>
          </motion.div>
        </section>

        {/* Feature Grid */}
        <section className="py-32 px-6 relative" id="specs">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { icon: <Zap />, title: "Adaptive Workload Engine", desc: "Our proprietary intelligent gateway analyzes intent and optimizes for speed, accuracy, and cost behind the scenes.", color: "text-brand-cyan" },
              { icon: <ShieldCheck />, title: "Smart Edge Caching", desc: "We actively identify redundant queries across your app, serving cached responses instantly for 0ms latency.", color: "text-brand-purple" },
              { icon: <Globe />, title: "Built for Africa", desc: "Predictable local fiat pricing and automated M-Pesa STK push. Build products, not payment infrastructure.", color: "text-brand-blue" }
            ].map((f, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-10 rounded-[2.5rem] bg-white/[0.03] border border-white/5 backdrop-blur-2xl group hover:border-white/10 hover:bg-white/[0.05] transition-all relative overflow-hidden"
              >
                <div className={`w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-8 ${f.color} group-hover:scale-110 transition-transform shadow-inner`}>
                    {f.icon}
                </div>
                <h3 className="text-2xl font-black mb-4 text-white tracking-tight">{f.title}</h3>
                <p className="text-gray-400 leading-relaxed font-medium">{f.desc}</p>
                <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-brand-cyan/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* API Playground (Unified Terminal) */}
        <section className="py-40 px-6 relative" id="playground">
            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-20">
                    <h2 className="text-5xl md:text-7xl font-black mb-8 text-white tracking-tighter leading-tight">API Explorer</h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">
                        Test our frontier model directly in the browser. Customize parameters and witness the speed of localized inference.
                    </p>
                </div>
                
                {/* Unified Terminal Container */}
                <div className="bg-[#080808] rounded-[3.5rem] border border-white/5 shadow-2xl overflow-hidden flex flex-col lg:flex-row min-h-[700px]">
                    
                    {/* Input Pane */}
                    <div className="flex-1 border-r border-white/5 p-8 md:p-12 space-y-10 bg-white/[0.01]">
                        <div className="flex items-center gap-3 mb-2">
                            <TerminalSquare className="text-brand-cyan" size={20} />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Input Parameters</span>
                        </div>
                        
                        <div className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-4 ml-1">System Prompt</label>
                                <textarea className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-sm focus:border-brand-cyan transition-all outline-none resize-none h-28 font-medium shadow-inner" value={sysPrompt} onChange={(e) => setSysPrompt(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-4 ml-1">User Prompt</label>
                                <textarea className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-sm focus:border-brand-cyan transition-all outline-none resize-none h-44 font-medium shadow-inner" value={userPrompt} onChange={(e) => setUserPrompt(e.target.value)} />
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 pt-4">
                                <div className="space-y-4">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                                        <span>Temperature</span>
                                        <span className="text-brand-cyan">{temp}</span>
                                    </div>
                                    <input type="range" min="0" max="1" step="0.1" value={temp} onChange={(e) => setTemp(parseFloat(e.target.value))} className="w-full accent-brand-cyan" />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                                        <span>Max Tokens</span>
                                        <span className="text-brand-cyan">{tokens}</span>
                                    </div>
                                    <input type="range" min="50" max="1000" step="50" value={tokens} onChange={(e) => setTokens(parseInt(e.target.value))} className="w-full accent-brand-cyan" />
                                </div>
                            </div>

                            <button className="w-full py-5 bg-brand-cyan text-black font-black text-xl rounded-full hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-[0_0_30px_rgba(0,210,255,0.3)] mt-4" onClick={handleTest} disabled={loading}>
                                {loading ? <><div className="w-6 h-6 border-3 border-black border-t-transparent animate-spin rounded-full"></div> Running...</> : <><Zap size={22} /> Run Inference</>}
                            </button>
                        </div>
                    </div>

                    {/* Output Pane */}
                    <div className="flex-1 flex flex-col bg-black relative">
                        <div className="px-10 py-6 bg-white/[0.02] border-b border-white/5 flex justify-between items-center backdrop-blur-md sticky top-0">
                            <div className="flex items-center gap-4">
                                <div className="flex gap-2.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/30"></div>
                                    <div className="w-3 h-3 rounded-full bg-amber-500/30"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/30"></div>
                                </div>
                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-4">Inference Output</span>
                            </div>
                            <button className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${copied ? 'text-green-400' : 'text-gray-500 hover:text-white'}`} onClick={copyOutput}>
                                {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy Output</>}
                            </button>
                        </div>
                        <div className="p-12 flex-1 text-sm leading-relaxed overflow-y-auto prose prose-invert max-w-none font-medium custom-scrollbar">
                            <ReactMarkdown>
                                {output}
                            </ReactMarkdown>
                        </div>
                        {/* Glow effect in corner of output */}
                        <div className="absolute bottom-0 right-0 w-64 h-64 bg-brand-cyan/5 blur-[80px] pointer-events-none"></div>
                    </div>
                </div>
            </div>
        </section>

        {/* SDK Section */}
        <section className="py-40 relative px-6 z-10" id="sdk">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-24">
              <h2 className="text-4xl md:text-7xl font-black mb-8 text-white tracking-tighter leading-tight">The Applied Intelligence SDK</h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">Integrate our frontier model into your Python backend in seconds.</p>
            </div>
            
            <div className="glass-card rounded-[3rem] p-10 md:p-16 max-w-5xl mx-auto flex flex-col lg:flex-row gap-16 items-center border border-white/5 bg-white/[0.02] shadow-2xl">
              <div className="flex-1">
                  <h3 className="text-3xl font-black text-white mb-6 tracking-tight">Install via pip</h3>
                  <div className="bg-black border border-white/10 rounded-2xl p-5 mb-8 font-mono text-sm flex items-center justify-between shadow-inner group">
                      <span className="text-brand-cyan group-hover:drop-shadow-[0_0_5px_rgba(0,210,255,0.5)] transition-all">pip install applied-intelligence</span>
                      <button className="text-gray-500 hover:text-white transition-colors" onClick={() => navigator.clipboard.writeText('pip install applied-intelligence')}><Download size={18} /></button>
                  </div>
                  <ul className="space-y-6">
                      <li className="flex items-start gap-4 text-gray-300 font-medium"><Check size={22} className="text-brand-cyan shrink-0" /> Native Python typing and Pydantic validation</li>
                      <li className="flex items-start gap-4 text-gray-300 font-medium"><Check size={22} className="text-brand-cyan shrink-0" /> Automatic retry mechanisms for high availability</li>
                      <li className="flex items-start gap-4 text-gray-300 font-medium"><Check size={22} className="text-brand-cyan shrink-0" /> Streaming responses out of the box</li>
                  </ul>
              </div>
              <div className="flex-1 w-full bg-[#080808] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                  <div className="bg-white/[0.02] border-b border-white/5 px-6 py-4 flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/40"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-500/40"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500/40"></div>
                  </div>
                  <div className="p-8 text-sm font-mono overflow-x-auto text-gray-400 leading-relaxed">
                      <span className="text-brand-purple">import</span> applied_intelligence <span className="text-brand-purple">as</span> ai<br/><br/>
                      client = ai.Client(api_key=<span className="text-green-400">"YOUR_KEY"</span>)<br/><br/>
                      res = client.chat.completions.create(<br/>
                      &nbsp;&nbsp;model=<span className="text-green-400">"frontier-model"</span>,<br/>
                      &nbsp;&nbsp;messages=[&#123;<span className="text-green-400">"role"</span>: <span className="text-green-400">"user"</span>, <span className="text-green-400">"content"</span>: <span className="text-green-400">"Hello"</span>&#125;]<br/>
                      )<br/>
                      <span className="text-brand-purple">print</span>(res.choices[0].message.content)
                  </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enterprise Suite */}
        <section className="py-32 px-6 relative z-10" id="enterprise">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-24">
              <h2 className="text-4xl md:text-6xl font-black mb-6 text-white tracking-tighter leading-tight">Go Beyond Chat.<br/>Integrate True Analytics.</h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">Add enterprise-grade reasoning directly into your platform's backend. Send us raw data; we'll return structured, predictable JSON.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-brand-cyan/20 backdrop-blur-2xl overflow-hidden relative shadow-2xl">
                    <ShieldCheck className="text-brand-cyan mb-6" size={48} />
                    <h3 className="text-3xl font-black mb-4 text-white tracking-tight">Fraud & Anomaly Engine</h3>
                    <p className="text-gray-400 leading-relaxed font-medium mb-8">Protect your fintech platform, marketplace, or booking engine with our dedicated <span className="text-brand-cyan font-mono text-sm px-3 py-1 bg-brand-cyan/10 rounded-lg ml-1">/v1/fraud/analyze</span> endpoint.</p>
                    <ul className="space-y-5 mb-8">
                        <li className="flex items-start gap-4 text-gray-300 font-medium"><Check size={22} className="text-brand-cyan mt-0.5 shrink-0" /> <span className="text-sm"><b>Instant Insights:</b> Send raw transaction payloads and receive an immediate risk assessment.</span></li>
                        <li className="flex items-start gap-4 text-gray-300 font-medium"><Check size={22} className="text-brand-cyan mt-0.5 shrink-0" /> <span className="text-sm"><b>Deep Reasoning:</b> Powered by proprietary pipelines tuned for catching high-risk patterns and automated abuse.</span></li>
                    </ul>
                </div>
                <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-brand-purple/20 backdrop-blur-2xl overflow-hidden relative shadow-2xl">
                    <Database className="text-brand-purple mb-6" size={48} />
                    <h3 className="text-3xl font-black mb-4 text-white tracking-tight">Pure Data Analytics</h3>
                    <p className="text-gray-400 leading-relaxed font-medium mb-8">Turn unstructured data into actionable intelligence with our <span className="text-brand-purple font-mono text-sm px-3 py-1 bg-brand-purple/10 rounded-lg ml-1">/v1/data/analyze</span> endpoint.</p>
                    <ul className="space-y-5 mb-8">
                        <li className="flex items-start gap-4 text-gray-300 font-medium"><Check size={22} className="text-brand-purple mt-0.5 shrink-0" /> <span className="text-sm"><b>Massive Context Windows:</b> Send massive datasets or server logs. We support contexts large enough to read books.</span></li>
                        <li className="flex items-start gap-4 text-gray-300 font-medium"><Check size={22} className="text-brand-purple mt-0.5 shrink-0" /> <span className="text-sm"><b>Structured Outputs:</b> Designed for software, not humans. Our API returns perfectly structured JSON every time.</span></li>
                    </ul>
                </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-40 px-6" id="pricing">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-24">
              <h2 className="text-5xl md:text-8xl font-black mb-10 text-white tracking-tighter leading-tight">Simple. Transparent.</h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">Choose a plan that fits your scale. All billed via M-Pesa in KSh.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                  { name: "Starter", price: "1500", tokens: "30M", tpm: "60K", features: "Basic Data Analysis", context: "16K" },
                  { name: "Pro", price: "3500", tokens: "80M", tpm: "120K", features: "Intermediary Data Analytics", context: "32K", accent: true },
                  { name: "Premium", price: "5000", tokens: "120M", tpm: "200K", features: "Pro Data Analytics & Fraud Engine", context: "64K" },
                  { name: "Max", price: "8000", tokens: "150M", tpm: "500K", features: "Advanced Fraud & Deep Analytics", context: "128K" }
                ].map((p, i) => (
                  <motion.div 
                    key={i} 
                    whileHover={{ y: -10 }}
                    className={`p-10 rounded-[3rem] border transition-all relative overflow-hidden flex flex-col ${p.accent ? 'bg-white/10 border-brand-cyan shadow-[0_0_40px_rgba(0,210,255,0.15)]' : 'bg-white/[0.03] border-white/5 hover:border-white/10'}`}
                  >
                    {p.accent && <div className="absolute top-0 right-0 px-4 py-1 bg-brand-cyan text-black text-[8px] font-black uppercase tracking-widest rounded-bl-xl">Popular</div>}
                    <h3 className="text-2xl font-black mb-2 text-white tracking-tight">{p.name}</h3>
                    <div className="text-4xl font-black mb-10 text-white">KSh {p.price}<span className="text-xs text-gray-600 font-bold tracking-widest uppercase"> /mo</span></div>
                    <ul className="space-y-6 mb-12 text-sm text-gray-400 font-medium flex-1">
                      <li className="flex items-center gap-3"><Check size={18} className="text-brand-cyan" /> {p.tokens} tokens/mo</li>
                      <li className="flex items-center gap-3"><Check size={18} className="text-brand-cyan" /> {p.tpm} TPM</li>
                      <li className="flex items-start gap-3"><Check size={18} className="text-brand-cyan mt-1 shrink-0" /> <span className="leading-tight">{p.features}</span></li>
                      <li className="flex items-center gap-3"><Check size={18} className="text-brand-cyan" /> {p.context} context</li>
                    </ul>
                    <Link to="/login" className={`w-full py-4 rounded-full font-black text-sm text-center block transition-all ${p.accent ? 'bg-brand-cyan text-black hover:scale-105 shadow-[0_0_20px_rgba(0,210,255,0.3)]' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                      Select Plan
                    </Link>
                  </motion.div>
                ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-24 bg-black relative z-10">
        <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-20 mb-20">
                <div className="md:col-span-2">
                    <img src="/logo.png" alt="Applied Intelligence" className="h-24 mb-6 object-contain" />
                    <p className="text-gray-500 text-lg max-w-sm leading-relaxed font-medium">Empowering African Developers with state of the art applied intelligence.</p>
                </div>
                <div className="flex flex-col gap-5">
                    <h4 className="font-black text-white mb-4 uppercase tracking-[0.2em] text-[10px]">Platform</h4>
                    <a href="/docs" target="_blank" className="text-sm text-gray-500 hover:text-brand-cyan transition-colors font-medium">Documentation</a>
                    <a href="#playground" className="text-sm text-gray-500 hover:text-brand-cyan transition-colors font-medium">API Explorer</a>
                    <a href="#pricing" className="text-sm text-gray-500 hover:text-brand-cyan transition-colors font-medium">Pricing</a>
                    <Link to="/login" className="text-sm text-gray-500 hover:text-brand-cyan transition-colors font-medium">Console</Link>
                </div>
                <div className="flex flex-col gap-5">
                    <h4 className="font-black text-white mb-4 uppercase tracking-[0.2em] text-[10px]">Connect</h4>
                    <a href="#" className="text-sm text-gray-500 hover:text-brand-cyan transition-colors font-medium">GitHub</a>
                    <a href="#" className="text-sm text-gray-500 hover:text-brand-cyan transition-colors font-medium">Discord</a>
                    <a href="/starter-kit.zip" download className="text-sm text-brand-cyan hover:drop-shadow-[0_0_5px_rgba(0,210,255,0.5)] transition-all flex items-center gap-2 mt-4 font-black uppercase tracking-widest"><Download size={16} /> Starter Kit</a>
                </div>
            </div>
            <div className="border-t border-white/5 pt-12 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black uppercase tracking-widest text-gray-700">
                <span>&copy; {new Date().getFullYear()} Applied Intelligence. Built for Builders.</span>
                <div className="flex gap-10">
                    <Link to="/policies" className="hover:text-white transition-colors">Privacy</Link>
                    <Link to="/policies" className="hover:text-white transition-colors">Terms</Link>
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
}
