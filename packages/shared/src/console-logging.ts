/**
 * Console logging utilities with pretty formatting
 */

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
} as const;

// Check if we're in a browser or Node.js environment
const isBrowser =
  typeof window !== 'undefined' && typeof window.document !== 'undefined';
const supportsColor = !isBrowser && process.stdout?.isTTY;

/**
 * Apply color to text if colors are supported
 */
function colorize(text: string, color: string): string {
  if (!supportsColor) return text;
  return `${color}${text}${colors.reset}`;
}

/**
 * Get current timestamp in HH:MM:SS format
 */
function getTimestamp(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Print a message with a bold header
 */
export function printWithHeader(header: string, body: string): void {
  const formattedHeader = colorize(header, colors.bright + colors.cyan);
  console.log(`\n${formattedHeader}`);
  console.log(body);
}

/**
 * Print a divider line
 */
export function printDivider(char = '─', length = 60): void {
  console.log(colorize(char.repeat(length), colors.dim));
}

/**
 * Print text in a box with borders
 */
export function printBox(text: string, title?: string): void {
  const lines = text.split('\n');
  const maxLength = Math.max(...lines.map((l) => l.length), title?.length ?? 0);
  const top = `┌${'─'.repeat(maxLength + 2)}┐`;
  const bottom = `└${'─'.repeat(maxLength + 2)}┘`;

  console.log(colorize(top, colors.dim));

  if (title) {
    const titleLine = `│ ${colorize(title.padEnd(maxLength), colors.bright + colors.cyan)} │`;
    console.log(colorize(titleLine.replace(colors.reset, ''), colors.dim));
    console.log(colorize(`├${'─'.repeat(maxLength + 2)}┤`, colors.dim));
  }

  lines.forEach((line) => {
    const paddedLine = line.padEnd(maxLength);
    console.log(
      `${colorize('│', colors.dim)} ${paddedLine} ${colorize('│', colors.dim)}`,
    );
  });

  console.log(colorize(bottom, colors.dim));
}

/**
 * Standard log (gray timestamp + message)
 */
export function log(...args: unknown[]): void {
  const timestamp = colorize(`[${getTimestamp()}]`, colors.gray);
  console.log(timestamp, ...args);
}

/**
 * Info message (blue icon + message)
 */
export function info(...args: unknown[]): void {
  const prefix = colorize('ℹ', colors.blue);
  const timestamp = colorize(`[${getTimestamp()}]`, colors.gray);
  console.info(timestamp, prefix, ...args);
}

/**
 * Success message (green checkmark + message)
 */
export function success(...args: unknown[]): void {
  const prefix = colorize('✓', colors.green);
  const timestamp = colorize(`[${getTimestamp()}]`, colors.gray);
  console.log(
    timestamp,
    prefix,
    colorize(String(args[0]), colors.green),
    ...args.slice(1),
  );
}

/**
 * Warning message (yellow warning sign + message)
 */
export function warn(...args: unknown[]): void {
  const prefix = colorize('⚠', colors.yellow);
  const timestamp = colorize(`[${getTimestamp()}]`, colors.gray);
  console.warn(
    timestamp,
    prefix,
    colorize(String(args[0]), colors.yellow),
    ...args.slice(1),
  );
}

/**
 * Error message (red X + message)
 */
export function error(...args: unknown[]): void {
  const prefix = colorize('✖', colors.red);
  const timestamp = colorize(`[${getTimestamp()}]`, colors.gray);
  console.error(
    timestamp,
    prefix,
    colorize(String(args[0]), colors.red),
    ...args.slice(1),
  );
}

/**
 * Debug message (magenta bug icon + dimmed message)
 */
export function debug(...args: unknown[]): void {
  if (process.env.NODE_ENV === 'production') return;

  const prefix = colorize('🐛', colors.magenta);
  const timestamp = colorize(`[${getTimestamp()}]`, colors.gray);
  const dimmedArgs = args.map((arg) =>
    typeof arg === 'string' ? colorize(arg, colors.dim) : arg,
  );
  console.debug(timestamp, prefix, ...dimmedArgs);
}

/**
 * Print a progress indicator
 */
export function progress(current: number, total: number, label?: string): void {
  const percentage = Math.round((current / total) * 100);
  const barLength = 30;
  const filled = Math.round((current / total) * barLength);
  const empty = barLength - filled;

  const bar = `[${colorize('█'.repeat(filled), colors.green)}${'░'.repeat(empty)}]`;
  const percentStr = `${percentage}%`.padStart(4);
  const progressStr = `${current}/${total}`.padStart(9);

  const output = `${bar} ${colorize(percentStr, colors.bright)} ${progressStr}`;
  const fullOutput = label
    ? `${output} ${colorize(label, colors.dim)}`
    : output;

  // Use carriage return to update the same line
  process.stdout.write(`\r${fullOutput}`);

  // Add newline when complete
  if (current === total) {
    console.log();
  }
}

/**
 * Print a table from array of objects
 */
export function table(
  data: Record<string, unknown>[],
  headers?: string[],
): void {
  if (data.length === 0) {
    console.log('No data to display');
    return;
  }

  const keys = headers || Object.keys(data[0]);
  const columnWidths: Record<string, number> = {};

  // Calculate column widths
  keys.forEach((key) => {
    columnWidths[key] = Math.max(
      key.length,
      ...data.map((row) => String(row[key] ?? '').length),
    );
  });

  // Print header
  const headerRow = keys
    .map((key) =>
      colorize(key.padEnd(columnWidths[key]), colors.bright + colors.cyan),
    )
    .join(' │ ');
  console.log(headerRow);

  // Print separator
  const separator = keys
    .map((key) => '─'.repeat(columnWidths[key]))
    .join('─┼─');
  console.log(colorize(separator, colors.dim));

  // Print rows
  data.forEach((row) => {
    const rowStr = keys
      .map((key) => String(row[key] ?? '').padEnd(columnWidths[key]))
      .join(' │ ');
    console.log(rowStr);
  });
}

/**
 * Group related logs together with indentation
 */
export function group(label: string, fn: () => void): void {
  console.group(colorize(label, colors.bright + colors.cyan));
  fn();
  console.groupEnd();
}

/**
 * Group related async logs together with indentation
 */
export async function groupAsync(
  label: string,
  fn: () => Promise<void>,
): Promise<void> {
  console.group(colorize(label, colors.bright + colors.cyan));
  await fn();
  console.groupEnd();
}

/**
 * Clear the console
 */
export function clear(): void {
  console.clear();
}

/**
 * Print JSON with syntax highlighting
 */
export function json(obj: Record<string, unknown>, indent = 2): void {
  if (supportsColor) {
    const highlighted = JSON.stringify(obj, null, indent)
      .replace(/("[\w]+":)/g, colorize('$1', colors.blue)) // Keys
      .replace(/: "([^"]*)"/g, `: ${colorize('"$1"', colors.green)}`) // String values
      .replace(/: (\d+)/g, `: ${colorize('$1', colors.yellow)}`) // Numbers
      .replace(/: (true|false)/g, `: ${colorize('$1', colors.magenta)}`) // Booleans
      .replace(/: (null)/g, `: ${colorize('$1', colors.red)}`); // Null

    console.log(highlighted);
  } else {
    console.log(JSON.stringify(obj, null, indent));
  }
}

/**
 * Print a tree structure
 */
export function tree(
  obj: Record<string, unknown>,
  _indent = '',
  isLast = true,
  isRoot = true,
): void {
  if (isRoot) {
    console.log(colorize('┬', colors.dim));
  }

  if (typeof obj !== 'object' || obj === null) {
    console.log(colorize(String(obj), colors.green));
    return;
  }

  const entries = Object.entries(obj);
  entries.forEach(([key, value], index) => {
    const isLastItem = index === entries.length - 1;
    const prefix = isRoot ? '' : isLast ? '  ' : '│ ';
    const connector = isLastItem ? '└─' : '├─';

    console.log(
      colorize(prefix + connector, colors.dim),
      colorize(key, colors.cyan),
    );

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      tree(value as Record<string, unknown>, prefix, isLastItem, false);
    } else if (Array.isArray(value)) {
      const arrPrefix = prefix + (isLastItem ? '  ' : '│ ');
      value.forEach((item, i) => {
        const arrConnector = i === value.length - 1 ? '└─' : '├─';
        console.log(colorize(arrPrefix + arrConnector, colors.dim), item);
      });
    } else {
      const valuePrefix = prefix + (isLastItem ? '  ' : '│ ');
      console.log(
        colorize(`${valuePrefix}└─`, colors.dim),
        colorize(String(value), colors.green),
      );
    }
  });
}

// Export all functions as a default object for convenience
export default {
  printWithHeader,
  printDivider,
  printBox,
  log,
  info,
  success,
  warn,
  error,
  debug,
  progress,
  table,
  group,
  groupAsync,
  clear,
  json,
  tree,
};
