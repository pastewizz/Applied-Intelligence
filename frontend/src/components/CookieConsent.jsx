import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, Check } from 'lucide-react';

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-8 left-8 right-8 md:left-auto md:right-8 md:w-[400px] z-[200]"
        >
          <div className="bg-[#0a0a0a]/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group">
            <div className="flex items-start gap-6 relative z-10">
              <div className="p-4 bg-brand-cyan/10 rounded-2xl text-brand-cyan">
                <Cookie size={24} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2">Cookie Intelligence</h4>
                <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-6">
                  We use cookies to optimize your neural interface experience and analyze traffic patterns for infrastructure scaling.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={handleAccept}
                    className="flex-1 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-brand-cyan transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={14} /> Accept
                  </button>
                  <button 
                    onClick={() => setIsVisible(false)}
                    className="px-4 py-3 bg-white/5 text-gray-500 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/5"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>

            {/* Decorative background glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/5 blur-[40px] rounded-full pointer-events-none group-hover:bg-brand-cyan/10 transition-colors"></div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
