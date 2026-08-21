import { motion } from 'framer-motion';

export const Scene4 = () => {
  return (
    <motion.div
      className="absolute inset-0 z-20 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute top-[10vh] left-[10vw]">
        <motion.div 
          className="text-primary font-mono text-[1.2vw] mb-4 uppercase tracking-widest"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          03 / Client Experience
        </motion.div>
        
        <div className="overflow-hidden">
          <motion.h2 
            className="text-[4.5vw] leading-[1.1] font-display font-bold text-white max-w-[40vw]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            Dedicated Client <span className="text-gradient">Portal.</span>
          </motion.h2>
        </div>
      </div>

      {/* Dashboard Mockup - Slides up from bottom right */}
      <motion.div 
        className="absolute top-[30vh] right-[-10vw] w-[70vw] h-[80vh] bg-bg-card rounded-t-[2vw] rounded-bl-[2vw] border border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] p-[2vw] flex flex-col gap-[2vw]"
        initial={{ y: '100%', rotate: 5, opacity: 0 }}
        animate={{ y: 0, rotate: -2, opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.5, type: 'spring', bounce: 0.2 }}
      >
        {/* Dashboard Header */}
        <div className="flex justify-between items-center w-full">
          <div className="flex gap-[1vw] items-center">
            <div className="w-[3vw] h-[3vw] rounded-full bg-white/10" />
            <div className="w-[10vw] h-[2vh] bg-white/20 rounded-full" />
          </div>
          <div className="w-[8vw] h-[4vh] bg-primary/20 rounded-full border border-primary/30" />
        </div>

        {/* Dashboard Grid */}
        <div className="flex gap-[2vw] flex-1">
          {/* Sidebar */}
          <div className="w-[15vw] flex flex-col gap-[1vh]">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-full h-[4vh] bg-white/5 rounded-[0.5vw]" />
            ))}
          </div>
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col gap-[2vw]">
            {/* Stats Row */}
            <div className="flex gap-[1.5vw]">
              {[1, 2, 3].map(i => (
                <motion.div 
                  key={i} 
                  className="flex-1 h-[12vh] bg-bg-dark rounded-[1vw] border border-white/5 p-[1vw]"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.8 + i * 0.1 }}
                >
                  <div className="w-[40%] h-[1vh] bg-white/20 rounded-full mb-[2vh]" />
                  <div className="w-[60%] h-[3vh] bg-white/40 rounded-full" />
                </motion.div>
              ))}
            </div>

            {/* List Area */}
            <div className="flex-1 bg-bg-dark rounded-[1vw] border border-white/5 p-[1.5vw] flex flex-col gap-[1.5vh]">
              <div className="w-[20%] h-[2vh] bg-white/20 rounded-full mb-[1vh]" />
              {[1, 2, 3].map(i => (
                <motion.div 
                  key={i} 
                  className="w-full h-[6vh] bg-white/5 rounded-[0.5vw] flex items-center justify-between px-[1vw]"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1 + i * 0.1 }}
                >
                  <div className="flex gap-[1vw] items-center">
                    <div className="w-[2vw] h-[2vw] rounded-[0.2vw] bg-white/10" />
                    <div className="w-[15vw] h-[1.5vh] bg-white/20 rounded-full" />
                  </div>
                  <div className="w-[5vw] h-[2vh] bg-success/20 rounded-full border border-success/30" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Floating Interaction (Cursor) */}
      <motion.div 
        className="absolute w-[3vw] h-[3vw] z-50 mix-blend-difference"
        initial={{ x: '80vw', y: '80vh', opacity: 0 }}
        animate={{ x: '65vw', y: '50vh', opacity: 1 }}
        transition={{ duration: 1.5, delay: 1.5, ease: "backOut" }}
      >
        <svg viewBox="0 0 24 24" fill="white" stroke="black" strokeWidth="1" className="drop-shadow-lg">
          <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .5-.5v-12a.5.5 0 0 0-.5-.5H6a.5.5 0 0 0-.5.5z"/>
        </svg>
        <motion.div 
          className="absolute top-[-1vw] left-[-1vw] w-[5vw] h-[5vw] border-2 border-white rounded-full"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.8, delay: 3, ease: "easeOut" }}
        />
      </motion.div>
    </motion.div>
  );
};
