import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2, ArrowLeft, ShieldCheck, Key, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { getSupabase } from '../supabase';
import { mapSupabaseError } from '../utils/errors';

export default function Auth() {
  const [view, setView] = useState('login'); // login, signup, forgot, mfa, confirmed
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordRules, setPasswordRules] = useState({
    length: false,
    upper: false,
    number: false,
    special: false
  });
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const rules = {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    setPasswordRules(rules);
  }, [password]);

  useEffect(() => {
    const handleSession = async () => {
      const supabase = await getSupabase();
      if (!supabase) return;

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setView('reset-password');
        } else if (session && view !== 'reset-password') {
          navigate('/dashboard');
        }
      });

      // Initial check for hash
      if (window.location.hash.includes('type=recovery')) {
        setView('reset-password');
      }

      return () => subscription.unsubscribe();
    };
    handleSession();
  }, [navigate, view]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const supabase = await getSupabase();
      if (!supabase) throw new Error("Connection failed.");

      if (view === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes("MFA")) setView('mfa');
          else throw error;
        } else {
          navigate('/dashboard');
        }
      } else if (view === 'signup') {
        // Validate all rules before submission
        if (!Object.values(passwordRules).every(Boolean)) {
          throw new Error("Password does not meet all security requirements.");
        }
        const { data, error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: { emailRedirectTo: `${window.location.origin}/login#type=recovery` }
        });
        if (error) throw error;
        if (!data.session) setView('confirmed');
        else navigate('/dashboard');
      } else if (view === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/login#type=recovery`
        });
        if (error) throw error;
        setView('confirmed');
        setError("Check your inbox for a recovery link.");
      } else if (view === 'reset-password') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setView('login');
        setError("Password updated successfully. Please log in.");
      }
    } catch (err) {
      setError(mapSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider) => {
    setLoading(true);
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/dashboard` }
      });
      if (error) throw error;
    } catch (err) {
      setError(mapSupabaseError(err));
      setLoading(false);
    }
  };

  const handleMfaChallenge = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        const supabase = await getSupabase();
        setError("MFA Verification is active but requires manual config for specific codes.");
    } catch (err) {
        setError(mapSupabaseError(err));
    } finally {
        setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (!error) return '';
    if (error.includes("Account created") || error.includes("Password updated")) return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
    if (error.includes("Check your inbox") || error.includes("link has been dispatched")) return "bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan";
    if (error.includes("rules") || error.includes("weak")) return "bg-amber-500/10 border-amber-500/20 text-amber-400";
    return "bg-red-500/10 border-red-500/20 text-red-500";
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative px-6 py-8">
      <div className="bg-grid absolute inset-0 z-0 pointer-events-none"></div>
      
      <div className="relative z-10 max-w-6xl w-full mx-auto mb-8">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest bg-white/5 px-6 py-3 rounded-full border border-white/5">
            <ArrowLeft size={14} /> Back to Hub
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md glass-card p-12 rounded-[3rem] shadow-2xl relative">
            
            <div className="text-center mb-10">
                <div className="flex items-center justify-center mb-10">
                    <img src="/logo.png" alt="Applied Intelligence" className="h-16 object-contain" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
                    {view === 'login' && "Welcome Back"}
                    {view === 'signup' && "Create Account"}
                    {view === 'forgot' && "Recover Access"}
                    {view === 'confirmed' && "Check Email"}
                    {view === 'mfa' && "Security Code"}
                    {view === 'reset-password' && "New Password"}
                </h2>
                <p className="text-gray-500 text-sm font-medium">
                    {view === 'login' && "Access your neural interface dashboard."}
                    {view === 'signup' && "Join the intelligence network today."}
                    {view === 'forgot' && "We'll send recovery instructions."}
                    {view === 'confirmed' && "A secure link has been dispatched."}
                    {view === 'mfa' && "Enter the multi-factor auth code."}
                    {view === 'reset-password' && "Set a new secure password."}
                </p>
            </div>

            {error && <div className={`p-5 rounded-2xl text-xs font-bold leading-relaxed mb-8 border transition-colors ${getStatusColor()}`}>{error}</div>}

            <AnimatePresence mode="wait">
                {view === 'confirmed' ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
                        <CheckCircle2 className="mx-auto text-brand-cyan mb-6" size={64} />
                        <p className="text-gray-400 text-sm mb-10 leading-relaxed font-medium px-4">Please check your inbox (and spam folder) for a verification link to continue.</p>
                        <button onClick={() => setView('login')} className="w-full py-5 bg-white text-black font-black text-xs uppercase tracking-widest rounded-full hover:bg-brand-cyan transition-all">Return to Login</button>
                    </motion.div>
                ) : (
                    <motion.form 
                        key={view}
                        initial={{ opacity: 0, x: 10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        onSubmit={view === 'mfa' ? handleMfaChallenge : handleAuth} 
                        className="flex flex-col gap-6"
                    >
                        {(view === 'login' || view === 'signup' || view === 'forgot') && (
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-2">Email Address</label>
                                <div className="relative group">
                                    <Mail size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-brand-cyan transition-colors" />
                                    <input type="email" className="w-full bg-black border border-white/10 rounded-2xl pl-16 pr-6 py-5 text-white focus:border-brand-cyan focus:outline-none transition-all shadow-inner font-medium" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                </div>
                            </div>
                        )}

                        {(view === 'login' || view === 'signup' || view === 'reset-password') && (
                            <div>
                                <div className="flex justify-between items-center mb-3 px-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Password</label>
                                    {view === 'login' && (
                                        <button type="button" onClick={() => setView('forgot')} className="text-[9px] font-black text-brand-cyan uppercase tracking-widest hover:text-white transition-colors">Forgot Key?</button>
                                    )}
                                </div>
                                <div className="relative group">
                                    <Lock size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-brand-cyan transition-colors" />
                                    <input type={showPassword ? "text" : "password"} className="w-full bg-black border border-white/10 rounded-2xl pl-16 pr-14 py-5 text-white focus:border-brand-cyan focus:outline-none transition-all shadow-inner font-medium" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-700 hover:text-white transition-colors">
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                
                                {view === 'signup' && (
                                    <div className="mt-6 p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-1.5 h-1.5 rounded-full ${passwordRules.length ? 'bg-emerald-500' : 'bg-gray-700'}`}></div>
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${passwordRules.length ? 'text-emerald-500' : 'text-gray-500'}`}>At least 8 characters</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-1.5 h-1.5 rounded-full ${passwordRules.upper ? 'bg-emerald-500' : 'bg-gray-700'}`}></div>
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${passwordRules.upper ? 'text-emerald-500' : 'text-gray-500'}`}>One uppercase letter</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-1.5 h-1.5 rounded-full ${passwordRules.number ? 'bg-emerald-500' : 'bg-gray-700'}`}></div>
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${passwordRules.number ? 'text-emerald-500' : 'text-gray-500'}`}>One number</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-1.5 h-1.5 rounded-full ${passwordRules.special ? 'bg-emerald-500' : 'bg-gray-700'}`}></div>
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${passwordRules.special ? 'text-emerald-500' : 'text-gray-500'}`}>One special character</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {view === 'mfa' && (
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-2">Security Code</label>
                                <div className="relative group">
                                    <ShieldCheck size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-brand-cyan transition-colors" />
                                    <input type="text" className="w-full bg-black border border-white/10 rounded-2xl pl-16 pr-6 py-5 text-white text-center font-mono text-2xl tracking-[0.5em] focus:border-brand-cyan focus:outline-none transition-all shadow-inner" placeholder="000000" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} required />
                                </div>
                            </div>
                        )}

                        <button type="submit" disabled={loading} className="w-full py-5 bg-white text-black font-black text-xs uppercase tracking-widest rounded-full hover:bg-brand-cyan transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95 disabled:opacity-50">
                            {loading ? <Loader2 className="animate-spin" size={18} /> : (
                                <>
                                    {view === 'login' && "Access Intelligence"}
                                    {view === 'signup' && "Create Identity"}
                                    {view === 'forgot' && "Send Recovery Link"}
                                    {view === 'mfa' && 'Verify Identity'}
                                    {view === 'reset-password' && "Update Password"}
                                </>
                            )}
                        </button>

                        {(view === 'login' || view === 'signup') && (
                            <>
                                <div className="flex items-center gap-4 py-2">
                                    <div className="h-px flex-1 bg-white/5"></div>
                                    <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest">Secure OAuth</span>
                                    <div className="h-px flex-1 bg-white/5"></div>
                                </div>

                                <button type="button" onClick={() => handleSocialAuth('github')} className="w-full py-5 bg-[#171717] hover:bg-[#202020] text-white border border-white/5 rounded-full font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-4 group">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="group-hover:text-brand-cyan transition-colors">
                                        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                                    </svg>
                                    Continue with GitHub
                                </button>
                            </>
                        )}
                    </motion.form>
                )}
            </AnimatePresence>

            <div className="text-center mt-10 text-[10px] font-black uppercase tracking-widest text-gray-600">
                {view === 'login' && (
                    <>New to the network? <button onClick={() => setView('signup')} className="text-white hover:text-brand-cyan transition-colors ml-1">Establish Profile</button></>
                )}
                {(view === 'signup' || view === 'forgot' || view === 'mfa' || view === 'reset-password') && (
                    <>Already verified? <button onClick={() => setView('login')} className="text-white hover:text-brand-cyan transition-colors ml-1">Authorize Profile</button></>
                )}
            </div>
        </motion.div>
      </div>
    </div>
  );
}
