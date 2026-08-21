import { motion } from 'framer-motion';

export const GlobalContinuity = ({ currentScene }: { currentScene: number }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {/* Background Gradient Blob 1 */}
      <motion.div
        className="absolute rounded-full blur-[100px] opacity-40 mix-blend-screen"
        style={{ background: 'var(--color-primary)' }}
        animate={{
          width: currentScene === 0 ? '60vw' : currentScene === 2 ? '40vw' : '50vw',
          height: currentScene === 0 ? '60vw' : currentScene === 2 ? '40vw' : '50vw',
          x: currentScene === 0 ? '-10vw' : currentScene === 2 ? '50vw' : '10vw',
          y: currentScene === 0 ? '-20vh' : currentScene === 2 ? '10vh' : '40vh',
          scale: currentScene === 5 ? 1.5 : 1,
          opacity: currentScene === 5 ? 0.2 : 0.4,
        }}
        transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
      />
      
      {/* Background Gradient Blob 2 (Green) */}
      <motion.div
        className="absolute rounded-full blur-[100px] opacity-30 mix-blend-screen"
        style={{ background: 'var(--color-success)' }}
        animate={{
          width: currentScene === 1 ? '70vw' : currentScene === 3 ? '50vw' : '40vw',
          height: currentScene === 1 ? '70vw' : currentScene === 3 ? '50vw' : '40vw',
          x: currentScene === 1 ? '40vw' : currentScene === 3 ? '-10vw' : '60vw',
          y: currentScene === 1 ? '-10vh' : currentScene === 3 ? '30vh' : '60vh',
          scale: currentScene === 5 ? 0.5 : 1,
        }}
        transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Persistent Tiny Brand Logo in bottom corner */}
      <motion.div 
        className="absolute bottom-[4vh] left-[4vw] flex items-center gap-[0.5vw]"
        initial={{ opacity: 0 }}
        animate={{ opacity: currentScene > 0 && currentScene < 5 ? 1 : 0 }}
        transition={{ duration: 1 }}
      >
        <div className="w-[1.5vw] h-[1.5vw] rounded-[0.2vw] bg-primary flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-[1vw] h-[1vw]">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
        <span className="text-white font-display font-semibold text-[1vw] tracking-wide">RAYA</span>
      </motion.div>
      
      {/* Scene indicator lines */}
      <div className="absolute top-[4vh] left-[50vw] -translate-x-1/2 flex gap-[0.5vw]">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            className="h-[0.5vh] rounded-full bg-white"
            initial={{ width: '1vw', opacity: 0.2 }}
            animate={{ 
              width: currentScene === i ? '3vw' : '1vw',
              opacity: currentScene === i ? 1 : 0.2,
              backgroundColor: currentScene === i ? 'var(--color-primary)' : '#ffffff'
            }}
            transition={{ duration: 0.5 }}
          />
        ))}
      </div>
    </div>
  );
};