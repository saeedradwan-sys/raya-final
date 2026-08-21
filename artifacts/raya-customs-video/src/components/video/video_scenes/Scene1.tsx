import { motion } from 'framer-motion';

export const Scene1 = () => {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ scale: 1.1, opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative text-center">
        {/* Animated Brand Mark */}
        <motion.div 
          className="w-[8vw] h-[8vw] mx-auto mb-[4vh] relative"
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 1.2, type: 'spring', bounce: 0.4 }}
        >
          <div className="absolute inset-0 bg-primary rounded-2xl rotate-45 opacity-20 blur-md" />
          <div className="absolute inset-0 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-[4vw] h-[4vw]">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </motion.div>

        <div className="overflow-hidden">
          <motion.h1 
            className="text-[6vw] leading-none font-display font-bold tracking-tighter text-white"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            RAYA <span className="text-gradient">Customs</span>
          </motion.h1>
        </div>
        
        <div className="overflow-hidden mt-[3vh]">
          <motion.p 
            className="text-[2vw] font-body text-text-secondary tracking-tight"
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            Logistics OS for the Modern Forwarder
          </motion.p>
        </div>
      </div>
      
      {/* Decorative accent lines */}
      <motion.div 
        className="absolute top-1/2 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.5, delay: 0.5, ease: 'easeInOut' }}
      />
    </motion.div>
  );
};
