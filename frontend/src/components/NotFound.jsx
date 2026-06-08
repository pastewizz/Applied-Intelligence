import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Ghost, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="container" style={{height: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
      <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}}>
        <div style={{display: 'inline-flex', padding: '2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '50%', marginBottom: '2rem'}}>
            <Ghost size={64} color="#888" />
        </div>
        <h1 style={{fontSize: '4rem', marginBottom: '1rem'}}>404</h1>
        <h2 style={{fontSize: '1.5rem', marginBottom: '2rem', color: 'var(--text-muted)'}}>The endpoint you're looking for doesn't exist.</h2>
        <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
            <button className="btn" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Go Back</button>
            <button className="btn btn-primary" onClick={() => navigate('/')}><Home size={16} /> Return Home</button>
        </div>
      </motion.div>
    </div>
  );
}
