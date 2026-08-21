import { motion } from 'framer-motion';

export const Scene2 = () => {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-between px-[10vw] z-20"
      initial={{ opacity: 0, x: '5vw' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ x: '-5vw', opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Left Text Content */}
      <div className="w-[40%] flex flex-col justify-center">
        <div className="overflow-hidden">
          <motion.div 
            className="text-primary font-mono text-[1.2vw] mb-4 uppercase tracking-widest"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            01 / Operations
          </motion.div>
        </div>
        <div className="overflow-hidden">
          <motion.h2 
            className="text-[4.5vw] leading-[1.1] font-display font-bold text-white mb-6"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            Connected<br/>
            <span className="text-gradient">Clearance</span><br/>
            Workflow.
          </motion.h2>
        </div>
      </div>

      {/* Right Graphic - Document / Cards */}
      <div className="w-[50%] h-[70vh] relative perspective-1000">
        <motion.div 
          className="absolute inset-0 flex items-center justify-center"
          initial={{ rotateY: 20, rotateX: 10, scale: 0.8, opacity: 0 }}
          animate={{ rotateY: -10, rotateX: 5, scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.4, type: 'spring', bounce: 0.2 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Main Card */}
          <div className="w-[30vw] h-[45vh] bg-bg-card rounded-[2vw] border border-white/10 shadow-2xl p-[2vw] relative overflow-hidden backdrop-blur-xl">
            {/* Header skeleton */}
            <div className="flex justify-between items-center mb-[3vh]">
              <div className="w-[10vw] h-[2vh] bg-white/20 rounded-full" />
              <div className="w-[4vw] h-[2vh] bg-primary/40 rounded-full" />
            </div>
            
            {/* Body skeleton lines */}
            <div className="space-y-[1.5vh] mb-[4vh]">
              <div className="w-[100%] h-[1.5vh] bg-white/10 rounded-full" />
              <div className="w-[80%] h-[1.5vh] bg-white/10 rounded-full" />
              <div className="w-[90%] h-[1.5vh] bg-white/10 rounded-full" />
            </div>

            {/* Simulated interactive elements */}
            <div className="flex gap-[1vw]">
              <div className="w-[40%] h-[6vh] bg-white/5 rounded-lg border border-white/5" />
              <div className="w-[40%] h-[6vh] bg-white/5 rounded-lg border border-white/5" />
            </div>

            {/* Approval Stamp */}
            <motion.div 
              className="absolute top-[5vh] right-[2vw] w-[8vw] h-[8vw] rounded-full border-4 border-success text-success flex items-center justify-center rotate-12 opacity-80"
              initial={{ scale: 3, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.8 }}
              transition={{ duration: 0.5, delay: 1.2, type: 'spring', bounce: 0.6 }}
            >
              <span className="font-display font-bold text-[1.5vw] uppercase tracking-wider">Approved</span>
            </motion.div>
            
            <div className="absolute -inset-10 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-100%]" />
            <motion.div 
              className="absolute -inset-10 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
              animate={{ translateX: ['-100%', '200%'] }}
              transition={{ duration: 2, delay: 1, repeat: Infinity, repeatDelay: 3 }}
            />
          </div>

          {/* Floating decorative elements behind */}
          <motion.div 
            className="absolute -z-10 w-[20vw] h-[30vh] bg-primary/20 rounded-[2vw] border border-primary/30 backdrop-blur-md"
            style={{ transform: 'translateZ(-50px)' }}
            initial={{ x: 0, y: 0 }}
            animate={{ x: '-4vw', y: '-4vh' }}
            transition={{ duration: 1.5, delay: 0.6, type: 'spring', bounce: 0.2 }}
          />
          <motion.div 
            className="absolute -z-20 w-[20vw] h-[30vh] bg-success/10 rounded-[2vw] border border-success/20 backdrop-blur-md"
            style={{ transform: 'translateZ(-100px)' }}
            initial={{ x: 0, y: 0 }}
            animate={{ x: '4vw', y: '4vh' }}
            transition={{ duration: 1.5, delay: 0.7, type: 'spring', bounce: 0.2 }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};
