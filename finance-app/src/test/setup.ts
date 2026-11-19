import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, vi } from 'vitest';

afterEach(cleanup);

// jsdom has no layout, so ResponsiveContainer measures 0x0 and logs warnings.
// Render children at a fixed size instead.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  const { cloneElement } = await import('react');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) =>
      cloneElement(children as React.ReactElement<{ width: number; height: number }>, { width: 800, height: 320 }),
  };
});
