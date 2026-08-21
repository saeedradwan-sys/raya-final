import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export const Scene3 = () => {
  const [activeNode, setActiveNode] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setActiveNode(1), 1000);
    const timer2 = setTimeout(() => setActiveNode(2), 2000);
    const timer3 = setTimeout(() => setActiveNode(3), 3000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const nodes = [
    { label: 'Origin', time: '08:00' },
    { label: 'Customs', time: '14:30' },
    { label: 'In Transit', time: '18:45' },
    { label: 'Destination', time: 'Est. Tomorrow' }
  ];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-[10vw] z-20"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: '5vh' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="text-center mb-[10vh]">
        <motion.div 
          className="text-primary font-mono text-[1.2vw] mb-4 uppercase tracking-widest"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          02 / Visibility
        </motion.div>
        
        <div className="overflow-hidden">
          <motion.h2 
            className="text-[4.5vw] leading-none font-display font-bold text-white"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            Live Shipment <span className="text-gradient">Tracking.</span>
          </motion.h2>
        </div>
      </div>

      {/* Timeline Graphic */}
      <div className="w-[80vw] h-[20vh] relative flex items-center justify-between">
        {/* Track Line Base */}
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/10 -translate-y-1/2 z-0" />
        
        {/* Active Track Line */}
        <motion.div 
          className="absolute top-1/2 left-0 h-[2px] bg-primary -translate-y-1/2 z-0"
          initial={{ width: 0 }}
          animate={{ width: `${(activeNode / (nodes.length - 1)) * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />

        {/* Nodes */}
        {nodes.map((node, i) => (
          <div key={i} className="relative z-10 flex flex-col items-center gap-[2vh]">
            {/* Top Label */}
            <motion.div 
              className={`text-[1.2vw] font-display font-medium ${i <= activeNode ? 'text-white' : 'text-white/40'}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              {node.label}
            </motion.div>
            
            {/* Node Circle */}
            <motion.div 
              className={`w-[2vw] h-[2vw] rounded-full border-[3px] bg-bg-dark flex items-center justify-center relative ${
                i < activeNode ? 'border-primary' : 
                i === activeNode ? 'border-success' : 'border-white/20'
              }`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 + i * 0.1, type: 'spring' }}
            >
              {i === activeNode && (
                <motion.div 
                  className="absolute inset-0 bg-success rounded-full opacity-30"
                  animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              {i <= activeNode && <div className={`w-[0.8vw] h-[0.8vw] rounded-full ${i === activeNode ? 'bg-success' : 'bg-primary'}`} />}
            </motion.div>

            {/* Bottom Time */}
            <motion.div 
              className={`text-[1vw] font-mono ${i <= activeNode ? 'text-primary' : 'text-white/30'}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
            >
              {node.time}
            </motion.div>
          </div>
        ))}
      </div>
      
      {/* Floating Info Box for the active node */}
      <motion.div 
        className="absolute bottom-[15vh] bg-bg-card/80 backdrop-blur-xl border border-white/10 rounded-xl p-[1.5vw] shadow-2xl flex items-center gap-[1.5vw]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          x: `${(activeNode / (nodes.length - 1)) * 60 - 30}vw` 
        }}
        transition={{ duration: 0.5, type: 'spring' }}
      >
        <div className="w-[3vw] h-[3vw] bg-primary/20 rounded-full flex items-center justify-center text-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.5vw] h-[1.5vw]">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <div className="text-[1vw] text-white/60 font-mono mb-[0.2vh]">STATUS UPDATE</div>
          <div className="text-[1.2vw] text-white font-medium">Cleared at Customs Checkpoint</div>
        </div>
      </motion.div>

    </motion.div>
  );
};
