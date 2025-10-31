'use client';

import { Button } from '@client/components/ui/button';
import { motion } from 'framer-motion';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeSelect(): React.ReactElement {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="icon">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <motion.div
      className="inline-flex items-center rounded-md border bg-background shadow-xs hover:text-accent-foreground dark:bg-input/30 dark:border-input"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      role="toolbar"
      aria-label="Theme selector"
      initial={false}
    >
      <div className="flex items-center gap-1">
        <motion.div
          initial={false}
          animate={{
            opacity: isExpanded || theme === 'light' ? 1 : 0,
            width: isExpanded || theme === 'light' ? 'auto' : 0,
            marginRight: isExpanded || theme === 'light' ? 0 : -4,
          }}
          transition={{
            duration: 0.15,
            ease: 'easeOut',
          }}
          style={{ overflow: 'hidden', display: 'inline-block' }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme('light')}
            aria-label="Light theme"
            title="Light"
          >
            <Sun className="h-4 w-4" />
          </Button>
        </motion.div>
        <motion.div
          initial={false}
          animate={{
            opacity: isExpanded || theme === 'dark' ? 1 : 0,
            width: isExpanded || theme === 'dark' ? 'auto' : 0,
            marginRight: isExpanded || theme === 'dark' ? 0 : -4,
          }}
          transition={{
            duration: 0.15,
            ease: 'easeOut',
          }}
          style={{ overflow: 'hidden', display: 'inline-block' }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme('dark')}
            aria-label="Dark theme"
            title="Dark"
          >
            <Moon className="h-4 w-4" />
          </Button>
        </motion.div>
        <motion.div
          initial={false}
          animate={{
            opacity: isExpanded || theme === 'system' ? 1 : 0,
            width: isExpanded || theme === 'system' ? 'auto' : 0,
            marginRight: isExpanded || theme === 'system' ? 0 : -4,
          }}
          transition={{
            duration: 0.15,
            ease: 'easeOut',
          }}
          style={{ overflow: 'hidden', display: 'inline-block' }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme('system')}
            aria-label="System theme"
            title="System"
          >
            <Monitor className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
