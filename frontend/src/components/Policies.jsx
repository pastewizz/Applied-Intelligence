import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ShieldCheck, FileText, Scale, Ban, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Policies() {
  const [activeTab, setActiveTab] = useState('privacy');
  const navigate = useNavigate();

  const tabs = [
    { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck, tldr: "We don't store your prompts. Your data is your property." },
    { id: 'license', label: 'License & Usage', icon: FileText, tldr: "Limited rights to use our API for your apps. No reselling." },
    { id: 'acceptable-use', label: 'Acceptable Use', icon: Ban, tldr: "No illegal acts, no hate speech, no deepfakes." },
    { id: 'disclaimer', label: 'Legal Disclaimer', icon: Scale, tldr: "Service provided 'as-is'. No liability for outputs." },
  ];

  const content = {
    privacy: {
      title: "Privacy Policy",
      lastUpdated: "May 9, 2026",
      sections: [
        {
          h: "1. Data Processing Philosophy",
          p: "API Applied Intelligence operates on a Zero Retention basis. Our infrastructure is engineered to process inference requests in-memory. We do not maintain persistent records of your prompts or the model's outputs."
        },
        {
          h: "2. Training Data",
          p: "We do not use customer data (prompts or completions) to train or fine-tune our foundation models. Your intellectual property remains yours and never enters our training datasets."
        },
        {
          h: "3. Compliance",
          p: "We adhere to applicable data protection regulations regarding the handling of administrative metadata (billing and account information)."
        }
      ]
    },
    license: {
      title: "License & Usage Rights",
      lastUpdated: "May 9, 2026",
      sections: [
        {
          h: "1. Limited License",
          p: "API Applied Intelligence grants you a non-exclusive, non-transferable, revocable license to access our API solely for your internal business purposes or integration into your own applications."
        },
        {
          h: "2. Copyright & Intellectual Property",
          p: "All software, code, model weights, and branding associated with the platform are the exclusive property of API Applied Intelligence. Users are strictly prohibited from claiming copyright ownership over the service or attempting to reverse-engineer our proprietary technology."
        },
        {
          h: "3. Reselling Prohibition",
          p: "You may not resell, lease, or sublicense access to the API as a standalone service. You may only use the API as an integrated component of a larger application that provides significant additional value."
        },
        {
          h: "4. Integrity of Service",
          p: "Users are prohibited from any activity that compromises the integrity or performance of the infrastructure, including but not limited to stress testing, scraping, or automated abuse."
        }
      ]
    },
    'acceptable-use': {
        title: "Acceptable Use Policy",
        lastUpdated: "May 9, 2026",
        sections: [
          {
            h: "1. Illegal Activities",
            p: "The use of the API for any illegal activity is strictly prohibited. This includes the generation of content that facilitates fraud, cybercrime, or any violation of the law."
          },
          {
            h: "2. Harmful Content",
            p: "You may not use the service to generate hate speech, promote violence, or create sexually explicit content. We maintain an automated safety layer to detect and block such requests."
          },
          {
            h: "3. Misinformation",
            p: "Users may not use the service to create or distribute intentionally misleading information or deepfakes intended to deceive the public."
          }
        ]
      },
      disclaimer: {
        title: "Legal Disclaimer",
        lastUpdated: "May 9, 2026",
        sections: [
          {
            h: "1. 'As-Is' Service",
            p: "The API is provided on an 'as-is' and 'as-available' basis. We make no warranties, expressed or implied, regarding the accuracy, reliability, or fitness for a particular purpose of the AI-generated outputs."
          },
          {
            h: "2. Limitation of Liability",
            p: "To the maximum extent permitted by law, API Applied Intelligence and its operators shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the service."
          },
          {
            h: "3. Indemnification",
            p: "You agree to indemnify and hold harmless API Applied Intelligence from any claims, damages, or losses arising from your use of the service in violation of these policies."
          }
        ]
      }
  };

  const activeTabInfo = tabs.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-[#020408] selection:bg-brand-cyan/30">
      
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 py-12 flex justify-between items-center">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-all bg-white/5 px-6 py-3 rounded-full border border-white/5"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="h-10 object-contain" />
          <span className="w-1 h-1 rounded-full bg-gray-800"></span>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Legal Center</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-16 pb-40">
        
        {/* Navigation Sidebar */}
        <aside className="space-y-10">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter mb-4">Policies</h1>
            <p className="text-gray-500 text-sm font-medium leading-relaxed">The legal framework governing your interaction with our intelligence infrastructure.</p>
          </div>

          <nav className="flex flex-col gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-left transition-all group ${activeTab === tab.id ? 'bg-white/10 text-brand-cyan border border-white/10 shadow-2xl' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
              >
                <tab.icon size={20} className={activeTab === tab.id ? 'text-brand-cyan' : 'group-hover:text-white'} />
                <span className="text-xs font-black uppercase tracking-widest">{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-8 rounded-[2rem] bg-brand-cyan/5 border border-brand-cyan/10">
            <h4 className="text-[10px] font-black text-brand-cyan uppercase tracking-[0.2em] mb-4">Compliance Notice</h4>
            <p className="text-[10px] text-gray-500 font-bold leading-relaxed">Our infrastructure is audited regularly to ensure compliance with global data protection standards.</p>
          </div>
        </aside>

        {/* Main Content Area */}
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[3rem] p-12 md:p-20 shadow-[0_40px_100px_rgba(0,0,0,0.5)] relative overflow-hidden"
        >
          {/* Content Header */}
          <header className="mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 mb-8">
              Official Document • {content[activeTab].lastUpdated}
            </div>
            <h2 className="text-6xl font-black text-black tracking-tighter mb-10 leading-tight">
              {content[activeTab].title}
            </h2>
            
            {/* TLDR Card */}
            <div className="bg-[#f8f9fa] border border-gray-100 p-8 rounded-[2rem] flex items-start gap-6">
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 text-brand-cyan">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">TL;DR Summary</h4>
                <p className="text-lg font-bold text-gray-800 leading-snug">{activeTabInfo.tldr}</p>
              </div>
            </div>
          </header>

          {/* Policy Sections */}
          <div className="space-y-16">
            {content[activeTab].sections.map((section, i) => (
              <div key={i} className="group">
                <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6 group-hover:text-brand-cyan transition-colors">
                  {section.h}
                </h3>
                <p className="text-xl font-medium text-gray-600 leading-relaxed max-w-3xl">
                  {section.p}
                </p>
              </div>
            ))}
          </div>

          <footer className="mt-32 pt-12 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white">
                <ShieldCheck size={20} />
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Verified Cryptographically
              </div>
            </div>
            <p className="text-[10px] text-gray-400 font-bold">© {new Date().getFullYear()} Applied Intelligence Legal Department</p>
          </footer>
          
          {/* Subtle decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/5 blur-[100px] rounded-full pointer-events-none"></div>
        </motion.div>

      </div>
    </div>
  );
}
