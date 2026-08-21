import { motion } from 'framer-motion';

export const Scene6 = () => {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative text-center">
        {/* Animated Brand Mark */}
        <motion.div 
          className="w-[10vw] h-[10vw] mx-auto mb-[5vh] relative"
          initial={{ scale: 0, rotate: 90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 1.2, delay: 0.2, type: 'spring', bounce: 0.4 }}
        >
          <motion.div 
            className="absolute inset-0 bg-primary rounded-[2vw] rotate-45 opacity-30 blur-xl" 
            animate={{ rotate: 405 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div 
            className="absolute inset-0 bg-primary rounded-[2vw] shadow-2xl shadow-primary/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-[5vw] h-[5vw]">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </motion.div>

        <div className="overflow-hidden">
          <motion.h1 
            className="text-[5vw] leading-none font-display font-bold tracking-tighter text-white"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            Run Your Agency on <span className="text-gradient">RAYA</span>
          </motion.h1>
        </div>
        
        <div className="overflow-hidden mt-[3vh]">
          <motion.p 
            className="text-[1.8vw] font-body text-text-secondary tracking-tight"
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            Connected. Automated. Audit-Proof.
          </motion.p>
        </div>
      </div>
      
      {/* Loop Flash Effect */}
      <motion.div 
        className="absolute inset-0 bg-white z-50 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1] }}
        transition={{ duration: 3.5, times: [0, 0.95, 1] }}
      />
    </motion.div>
  );
};
