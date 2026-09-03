'use client';

import { useEffect, useState } from 'react';

/** What the reader does when they take the scroll over themselves. */
const RELEASING_EVENTS = ['wheel', 'touchmove', 'pointerdown', 'keydown'];

export interface PinnedToBottom {
  /** Attach to the scrolling element. */
  ref: (node: HTMLElement | null) => void;
  /** Attach to the element inside it that the content makes as tall as it is. */
  contentRef: (node: HTMLElement | null) => void;
}

/**
 * Holds a scrolling pane at its bottom until the reader scrolls it
 * themselves, and re-arms whenever `key` changes.
 *
 * The content element is watched rather than the pane, because the content is
 * what grows: the pane's own box never changes, while the bodies inside it
 * mount lazily and arrive long after the first paint.
 *
 * Both elements are held as state rather than in refs. The pane is unmounted
 * while its content loads, so the effect has to run again once it comes back
 * -- against a ref it would run once, find null, and never retry.
 */
export function usePinnedToBottom(key: string | undefined): PinnedToBottom {
  const [pane, setPane] = useState<HTMLElement | null>(null);
  const [content, setContent] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!key || !pane || !content) return;

    let following = true;
    const pin = (): void => {
      if (following) {
        pane.scrollTop = pane.scrollHeight;
      }
    };
    const release = (): void => {
      following = false;
    };

    pin();
    const observer = new ResizeObserver(pin);
    observer.observe(content);
    for (const event of RELEASING_EVENTS) {
      pane.addEventListener(event, release, { passive: true });
    }

    return (): void => {
      observer.disconnect();
      for (const event of RELEASING_EVENTS) {
        pane.removeEventListener(event, release);
      }
    };
  }, [key, pane, content]);

  return { ref: setPane, contentRef: setContent };
}
