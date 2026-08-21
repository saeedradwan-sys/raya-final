import { motion } from 'framer-motion';

export const Scene5 = () => {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-[10vw] z-20"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="text-center mb-[8vh]">
        <motion.div 
          className="text-primary font-mono text-[1.2vw] mb-4 uppercase tracking-widest"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          04 / Finance
        </motion.div>
        
        <div className="overflow-hidden">
          <motion.h2 
            className="text-[4.5vw] leading-none font-display font-bold text-white"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            Audit-Proof <span className="text-gradient">Accounting.</span>
          </motion.h2>
        </div>
      </div>

      <div className="relative w-[60vw] h-[40vh] flex items-center justify-center perspective-1000">
        
        {/* Document 1 */}
        <motion.div 
          className="absolute w-[25vw] h-[35vh] bg-bg-card border border-white/10 shadow-2xl rounded-[1vw] p-[1.5vw]"
          initial={{ x: '-20vw', rotate: -15, opacity: 0, scale: 0.8 }}
          animate={{ x: '-15vw', rotate: -5, opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.5, type: 'spring' }}
        >
          <div className="w-[40%] h-[2vh] bg-white/20 rounded-full mb-[4vh]" />
          {[1,2,3].map(i => (
             <div key={i} className="flex justify-between mb-[2vh]">
               <div className="w-[50%] h-[1.5vh] bg-white/10 rounded-full" />
               <div className="w-[20%] h-[1.5vh] bg-white/10 rounded-full" />
             </div>
          ))}
        </motion.div>

        {/* Document 2 */}
        <motion.div 
          className="absolute w-[25vw] h-[35vh] bg-bg-card border border-white/10 shadow-2xl rounded-[1vw] p-[1.5vw]"
          initial={{ x: '20vw', rotate: 15, opacity: 0, scale: 0.8 }}
          animate={{ x: '15vw', rotate: 5, opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.7, type: 'spring' }}
        >
          <div className="w-[40%] h-[2vh] bg-white/20 rounded-full mb-[4vh]" />
          {[1,2,3].map(i => (
             <div key={i} className="flex justify-between mb-[2vh]">
               <div className="w-[50%] h-[1.5vh] bg-white/10 rounded-full" />
               <div className="w-[20%] h-[1.5vh] bg-white/10 rounded-full" />
             </div>
          ))}
        </motion.div>

        {/* Center Main Document (GST Report) */}
        <motion.div 
          className="absolute w-[30vw] h-[45vh] bg-bg-card border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.8)] rounded-[1.5vw] p-[2vw] flex flex-col z-10"
          initial={{ y: '20vh', opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 1, type: 'spring', bounce: 0.3 }}
        >
          <div className="text-center mb-[3vh]">
            <div className="w-[40%] h-[2.5vh] bg-primary/80 rounded-full mx-auto mb-[1vh]" />
            <div className="w-[20%] h-[1.5vh] bg-white/20 rounded-full mx-auto" />
          </div>

          <div className="bg-bg-dark rounded-[1vw] p-[1vw] mb-[2vh] border border-white/5">
            <div className="flex justify-between items-center">
              <div className="w-[30%] h-[2vh] bg-white/30 rounded-full" />
              <div className="w-[30%] h-[3vh] bg-success/80 rounded-full" />
            </div>
          </div>

          <div className="space-y-[1.5vh] flex-1">
            {[1,2,3,4].map(i => (
               <div key={i} className="w-full h-[1.5vh] bg-white/10 rounded-full" />
            ))}
          </div>

          {/* Lock Overlay */}
          <motion.div 
            className="absolute inset-0 bg-bg-card/40 backdrop-blur-[2px] rounded-[1.5vw] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.8 }}
          >
            <motion.div 
              className="w-[8vw] h-[8vw] bg-white rounded-full flex items-center justify-center shadow-2xl"
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 2, type: 'spring', bounce: 0.5 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" className="w-[4vw] h-[4vw]">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </motion.div>
          </motion.div>

        </motion.div>

      </div>
    </motion.div>
  );
};
