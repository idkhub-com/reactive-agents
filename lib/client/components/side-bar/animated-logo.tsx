'use client';

import { motion } from 'framer-motion';

interface AnimatedLogoProps {
  isCollapsed: boolean;
}

export function AnimatedLogo({ isCollapsed }: AnimatedLogoProps) {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-sm font-logo">
      {/* Animated gradient background that pulses */}
      <motion.div
        className="absolute inset-0 bg-linear-to-br from-blue-400 via-indigo-500 to-slate-500 dark:from-slate-900 dark:via-blue-950 dark:to-gray-900"
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
        }}
        transition={{
          duration: 16,
          repeat: Number.POSITIVE_INFINITY,
          ease: 'easeInOut',
        }}
        style={{
          backgroundSize: '400% 400%',
        }}
      />

      {/* Large glowing orbs that move dramatically */}
      <motion.div
        className="absolute w-32 h-32 rounded-full bg-slate-300/20 dark:bg-white/10 blur-2xl"
        animate={{
          x: [-20, 60, -20],
          y: [-10, 40, -10],
          scale: [1, 1.5, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 6,
          repeat: Number.POSITIVE_INFINITY,
          ease: 'easeInOut',
        }}
        style={{ top: '-20%', left: '-10%' }}
      />
      <motion.div
        className="absolute w-28 h-28 rounded-full bg-blue-400/30 dark:bg-blue-400/15 blur-2xl"
        animate={{
          x: [40, -30, 40],
          y: [20, -20, 20],
          scale: [1.2, 0.8, 1.2],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 8,
          repeat: Number.POSITIVE_INFINITY,
          ease: 'easeInOut',
          delay: 1,
        }}
        style={{ bottom: '-15%', right: '-10%' }}
      />

      {/* Pulsing rings */}
      <motion.div
        className="absolute top-1/2 left-1/2 w-20 h-20 border-2 border-white/15 dark:border-white/10 rounded-full"
        style={{
          x: '-50%',
          y: '-50%',
        }}
        animate={{
          scale: [0.8, 1.5, 0.8],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 4,
          repeat: Number.POSITIVE_INFINITY,
          ease: 'easeOut',
        }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 w-20 h-20 border-2 border-white/15 dark:border-white/10 rounded-full"
        style={{
          x: '-50%',
          y: '-50%',
        }}
        animate={{
          scale: [0.8, 1.5, 0.8],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 4,
          repeat: Number.POSITIVE_INFINITY,
          ease: 'easeOut',
          delay: 2,
        }}
      />

      {/* Logo text */}
      <div className="relative z-10 flex items-center justify-center h-full">
        {/* Collapsed state: "RA" */}
        <motion.span
          className="text-xl font-bold text-white absolute"
          initial={false}
          animate={{
            opacity: isCollapsed ? 1 : 0,
            scale: isCollapsed ? 1 : 0.9,
            filter: isCollapsed ? 'blur(0px)' : 'blur(4px)',
          }}
          transition={{
            duration: 0.3,
            ease: 'easeInOut',
          }}
          style={{
            visibility: isCollapsed ? 'visible' : 'hidden',
          }}
        >
          RA
        </motion.span>

        {/* Expanded state: "Reactive Agents" */}
        <motion.span
          className="text-xl font-bold text-white whitespace-nowrap"
          initial={false}
          animate={{
            opacity: isCollapsed ? 0 : 1,
            scale: isCollapsed ? 0.9 : 1,
            filter: isCollapsed ? 'blur(4px)' : 'blur(0px)',
          }}
          transition={{
            duration: 0.3,
            ease: 'easeInOut',
          }}
          style={{
            visibility: isCollapsed ? 'hidden' : 'visible',
          }}
        >
          Reactive Agents
        </motion.span>
      </div>
    </div>
  );
}
