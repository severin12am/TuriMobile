/// <reference types="vite/client" />

// This file contains type declarations for our project

// React JSX types
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

// Declare modules for any file types that TypeScript doesn't recognize
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
declare module '*.gif';
declare module '*.glb';
declare module '*.gltf';

// Extend existing modules
interface ImportMeta {
  env: {
    MODE: string;
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
    [key: string]: string;
  };
} 