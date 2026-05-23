/// <reference types="vite/client" />

// Explicit declarations so TypeScript accepts plain CSS side-effect imports
// (vite/client normally covers this, but some TS setups need it stated here)
declare module '*.css' {}
