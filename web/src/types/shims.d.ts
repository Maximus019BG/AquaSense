// Type shims to reduce TS errors in environments without node_modules installed.
// These are temporary and should be removed when proper types are available.

declare module 'recharts';
declare module 'react';
declare module 'react-dom';

declare module '*.css';

declare module '*.svg';

export {};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
