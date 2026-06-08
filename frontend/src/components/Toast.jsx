import React, { useState, createContext, useContext, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [modal, setModal] = useState(null);

  const showNotification = (message, type = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  const confirmAction = ({ title, message, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel' }) => {
    setModal({ title, message, onConfirm, confirmText, cancelText });
  };

  const closeModal = () => setModal(null);

  const handleConfirm = () => {
    if (modal?.onConfirm) modal.onConfirm();
    closeModal();
  };

  return (
    <NotificationContext.Provider value={{ showNotification, confirmAction }}>
      {children}
      
      {/* Notifications Portal */}
      <div className="fixed top-6 right-6 z-[1000] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto p-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px] border ${
                n.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                n.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                'bg-blue-500/10 border-blue-500/20 text-blue-400'
              } backdrop-blur-xl`}
            >
              {n.type === 'success' && <CheckCircle size={20} />}
              {n.type === 'error' && <AlertCircle size={20} />}
              {n.type === 'info' && <Info size={20} />}
              <span className="flex-1 font-medium">{n.message}</span>
              <button onClick={() => setNotifications((prev) => prev.filter((notif) => notif.id !== n.id))} className="opacity-50 hover:opacity-100">
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-[1001] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-surface border border-white/10 p-8 rounded-2xl max-w-md w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-4">{modal.title}</h3>
              <p className="text-gray-400 mb-8 leading-relaxed">{modal.message}</p>
              <div className="flex gap-4">
                <button
                  onClick={closeModal}
                  className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors"
                >
                  {modal.cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-500/20"
                >
                  {modal.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
};
