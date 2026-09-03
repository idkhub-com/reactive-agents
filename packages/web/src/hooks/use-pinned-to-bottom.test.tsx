import { fireEvent, render, screen } from '@testing-library/react';
import { usePinnedToBottom } from '@web/hooks/use-pinned-to-bottom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * jsdom implements neither scrolling nor layout: `scrollHeight` is always 0
 * and assigning `scrollTop` does nothing. Both are replaced on the prototype
 * so a test can say how tall the content is and see where the pane was sent.
 */
let contentHeight = 0;
let scrolledTo: number[] = [];
let originalScrollTop: PropertyDescriptor | undefined;
let originalScrollHeight: PropertyDescriptor | undefined;

/** The ResizeObservers alive right now, so a test can grow the content. */
let observers: ResizeObserverCallback[] = [];
const OriginalResizeObserver = global.ResizeObserver;

function grow(to: number): void {
  contentHeight = to;
  for (const observe of observers) {
    observe([], {} as ResizeObserver);
  }
}

beforeEach(() => {
  contentHeight = 1000;
  scrolledTo = [];
  observers = [];

  originalScrollTop = Object.getOwnPropertyDescriptor(
    Element.prototype,
    'scrollTop',
  );
  originalScrollHeight = Object.getOwnPropertyDescriptor(
    Element.prototype,
    'scrollHeight',
  );
  Object.defineProperty(Element.prototype, 'scrollTop', {
    configurable: true,
    get: () => scrolledTo[scrolledTo.length - 1] ?? 0,
    set: (value: number) => {
      scrolledTo.push(value);
    },
  });
  Object.defineProperty(Element.prototype, 'scrollHeight', {
    configurable: true,
    get: () => contentHeight,
  });

  global.ResizeObserver = class {
    constructor(private readonly callback: ResizeObserverCallback) {
      observers.push(callback);
    }
    observe(): void {
      // Which element is watched does not matter here; `grow` fires them all.
    }
    unobserve(): void {
      // Only `disconnect` is used, on the effect's cleanup.
    }
    disconnect(): void {
      observers = observers.filter((one) => one !== this.callback);
    }
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  if (originalScrollTop) {
    Object.defineProperty(Element.prototype, 'scrollTop', originalScrollTop);
  }
  if (originalScrollHeight) {
    Object.defineProperty(
      Element.prototype,
      'scrollHeight',
      originalScrollHeight,
    );
  }
  global.ResizeObserver = OriginalResizeObserver;
});

function Pane({
  logId,
  mounted = true,
}: {
  logId?: string;
  mounted?: boolean;
}): React.ReactElement {
  const pinned = usePinnedToBottom(logId);
  if (!mounted) return <div>loading</div>;
  return (
    <div data-testid="pane" ref={pinned.ref}>
      <div data-testid="content" ref={pinned.contentRef} />
    </div>
  );
}

describe('usePinnedToBottom', () => {
  it('sends the pane to the bottom when it mounts', () => {
    render(<Pane logId="log-1" />);
    expect(scrolledTo).toEqual([1000]);
  });

  it('follows the content as it grows', () => {
    render(<Pane logId="log-1" />);

    // The card bodies mount lazily, well after the pane's first paint.
    grow(4000);
    grow(9000);

    expect(scrolledTo).toEqual([1000, 4000, 9000]);
  });

  it('pins a pane that mounts after the log is known', () => {
    // The log arrives before the pane does -- the view is still showing its
    // loading skeleton. Against a ref the effect would run once here, find
    // nothing, and never pin.
    const { rerender } = render(<Pane logId="log-1" mounted={false} />);
    expect(scrolledTo).toEqual([]);

    rerender(<Pane logId="log-1" mounted={true} />);
    expect(scrolledTo).toEqual([1000]);
  });

  it.each([
    'wheel',
    'touchMove',
    'pointerDown',
    'keyDown',
  ] as const)('lets go once the reader takes over with %s', (interaction) => {
    render(<Pane logId="log-1" />);
    fireEvent[interaction](screen.getByTestId('pane'));

    grow(4000);

    expect(scrolledTo).toEqual([1000]);
  });

  it('re-arms when another log is opened', () => {
    const { rerender } = render(<Pane logId="log-1" />);
    fireEvent.wheel(screen.getByTestId('pane'));
    grow(4000);
    expect(scrolledTo).toEqual([1000]);

    rerender(<Pane logId="log-2" />);

    expect(scrolledTo).toEqual([1000, 4000]);
    grow(6000);
    expect(scrolledTo).toEqual([1000, 4000, 6000]);
  });

  it('does nothing until there is a log to open', () => {
    render(<Pane logId={undefined} />);
    grow(4000);
    expect(scrolledTo).toEqual([]);
  });

  it('stops watching the content once the pane is gone', () => {
    const { unmount } = render(<Pane logId="log-1" />);
    unmount();

    grow(4000);

    expect(scrolledTo).toEqual([1000]);
  });
});
