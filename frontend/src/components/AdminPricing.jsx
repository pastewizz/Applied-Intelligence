import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSupabase } from '../supabase';
import { Save, RefreshCw, AlertTriangle, CheckCircle, Loader2, Settings, DollarSign, Zap, Database, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const FIELD_META = [
  { key: 'price_kes',          label: 'Price (KSh/mo)',     type: 'number', hint: 'Monthly subscription price in Kenyan Shillings' },
  { key: 'rpm',                label: 'RPM',                type: 'number', hint: 'Max requests per minute' },
  { key: 'tpm',                label: 'TPM',                type: 'number', hint: 'Max tokens per minute' },
  { key: 'month_tokens',       label: 'Monthly Tokens',     type: 'number', hint: 'Total token budget per month' },
  { key: 'max_context_tokens', label: 'Max Context Tokens', type: 'number', hint: 'Max input tokens per single request' },
  { key: 'max_output_tokens',  label: 'Max Output Tokens',  type: 'number', hint: 'Max tokens the model can generate per request' },
  { key: 'display_name',       label: 'Display Name',       type: 'text',   hint: 'Shown to users on the pricing page' },
  { key: 'features',           label: 'Features (JSON)',    type: 'text',   hint: 'JSON array, e.g. ["30M tokens/month","60 RPM"]' },
];

const PLAN_ORDER = ['free', 'starter', 'pro', 'premium', 'max', 'enterprise'];
const PLAN_COLORS = {
  free: 'from-gray-500/20 to-gray-600/10 border-gray-500/20',
  starter: 'from-blue-500/20 to-blue-600/10 border-blue-500/20',
  pro: 'from-violet-500/20 to-violet-600/10 border-violet-500/20',
  premium: 'from-amber-500/20 to-amber-600/10 border-amber-500/20',
  max: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/20',
  enterprise: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20',
};

export default function AdminPricing() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState(null);
  const [edits, setEdits] = useState({});

  const getToken = async () => {
    const supabase = await getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch('/admin/pricing', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Access denied');
      }
      const data = await res.json();
      // Sort by our preferred order
      data.sort((a, b) => {
        const ai = PLAN_ORDER.indexOf(a.plan_name);
        const bi = PLAN_ORDER.indexOf(b.plan_name);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
      setPlans(data);
      // Initialise local edits state from fetched data
      const initial = {};
      for (const p of data) {
        initial[p.plan_name] = { ...p };
      }
      setEdits(initial);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleChange = (planName, key, value) => {
    setEdits(prev => ({
      ...prev,
      [planName]: { ...prev[planName], [key]: value }
    }));
  };

  const savePlan = async (planName) => {
    setSaving(planName);
    setSaved(null);
    try {
      const token = await getToken();
      const payload = { ...edits[planName] };
      // Coerce number fields
      for (const f of FIELD_META) {
        if (f.type === 'number' && payload[f.key] !== undefined) {
          payload[f.key] = Number(payload[f.key]);
        }
      }
      const res = await fetch(`/admin/pricing/${planName}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(planName);
      setTimeout(() => setSaved(null), 3000);
      fetchPlans();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  };

  const fmt = (n) => typeof n === 'number' ? n.toLocaleString() : n;

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 p-8 lg:p-16">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-16">
          <div>
            <Link to="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-white text-sm font-bold uppercase tracking-widest mb-8 transition-colors">
              <ArrowLeft size={16} /> Dashboard
            </Link>
            <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter mb-4">Pricing Config</h1>
            <p className="text-gray-500 text-lg font-medium">
              Edit plan limits live — changes take effect within 60 seconds. No redeploy needed.
            </p>
          </div>
          <button
            onClick={fetchPlans}
            className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-gray-400 hover:text-white transition-all"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-4 p-6 mb-12 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400"
            >
              <AlertTriangle size={20} />
              <span className="font-bold">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-400/50 hover:text-red-400">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={40} className="animate-spin text-cyan-400" />
          </div>
        )}

        {/* Plan Cards */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {plans.map(plan => {
              const colorClass = PLAN_COLORS[plan.plan_name] || 'from-white/10 to-white/5 border-white/10';
              const isSaving = saving === plan.plan_name;
              const wasSaved = saved === plan.plan_name;
              const local = edits[plan.plan_name] || plan;
              const isDirty = JSON.stringify(local) !== JSON.stringify(plan);

              return (
                <motion.div
                  key={plan.plan_name}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className={`bg-gradient-to-br ${colorClass} border rounded-3xl p-8 flex flex-col gap-6`}
                >
                  {/* Plan Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">{plan.plan_name}</div>
                      <div className="text-2xl font-black text-white tracking-tight">
                        {local.display_name || plan.display_name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-white">
                        {local.price_kes === 0 ? 'Free' : `KSh ${fmt(local.price_kes)}`}
                      </div>
                      {local.price_kes > 0 && <div className="text-[10px] text-gray-500 font-black uppercase">/month</div>}
                    </div>
                  </div>

                  {/* Stat pills */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: <Zap size={12}/>, label: 'RPM', val: fmt(local.rpm) },
                      { icon: <Database size={12}/>, label: 'TPM', val: (local.tpm >= 1_000_000 ? `${(local.tpm/1_000_000).toFixed(1)}M` : `${(local.tpm/1000).toFixed(0)}K`) },
                      { icon: <Settings size={12}/>, label: 'CTX', val: (local.max_context_tokens >= 1000 ? `${local.max_context_tokens/1000}K` : local.max_context_tokens) },
                    ].map(s => (
                      <div key={s.label} className="bg-black/30 rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">{s.icon}<span className="text-[9px] font-black uppercase tracking-widest">{s.label}</span></div>
                        <div className="text-sm font-black text-white">{s.val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Editable fields */}
                  <div className="space-y-3">
                    {FIELD_META.map(f => (
                      <div key={f.key}>
                        <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-1">{f.label}</label>
                        <input
                          type={f.type}
                          value={local[f.key] ?? ''}
                          onChange={e => handleChange(plan.plan_name, f.key, e.target.value)}
                          title={f.hint}
                          className="w-full bg-black/40 border border-white/10 focus:border-cyan-400/50 rounded-xl px-4 py-2.5 text-sm text-white font-mono outline-none transition-all placeholder:text-gray-700"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Save button */}
                  <button
                    onClick={() => savePlan(plan.plan_name)}
                    disabled={isSaving || !isDirty}
                    className={`w-full py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all
                      ${wasSaved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        isDirty ? 'bg-white text-black hover:bg-cyan-400 hover:scale-[1.02]' :
                        'bg-white/5 text-gray-700 cursor-not-allowed border border-white/5'}`}
                  >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> :
                     wasSaved ? <><CheckCircle size={14} /> Saved!</> :
                     <><Save size={14} /> {isDirty ? 'Save Changes' : 'No Changes'}</>}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Info footer */}
        <div className="mt-16 p-8 bg-cyan-500/5 border border-cyan-500/10 rounded-3xl">
          <h4 className="text-cyan-400 font-black mb-2">How it works</h4>
          <p className="text-gray-500 text-sm leading-relaxed">
            Changes are written to the <code className="text-cyan-400 bg-cyan-400/10 px-1 rounded">plan_configs</code> table in Supabase immediately.
            The API rate limiter caches plan limits for <strong className="text-white">60 seconds</strong>, so new limits apply to all requests within one minute — <strong className="text-white">no restart required</strong>.
            The fallback hardcoded values are used only if the database is unreachable.
          </p>
        </div>
      </div>
    </div>
  );
}
