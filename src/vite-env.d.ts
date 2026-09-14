/// <reference types="vite/client" />

// Declaração para imports de CSS
declare module '*.css' {
  const content: Record<string, string>
  export default content
}