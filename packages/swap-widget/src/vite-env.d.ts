/// <reference types="vite/client" />

declare module 'cashaddrjs' {
  export function decode(address: string): {
    prefix: string
    type: 'P2PKH' | 'P2SH'
    hash: Uint8Array
  }
  export function encode(prefix: string, type: 'P2PKH' | 'P2SH', hash: Uint8Array): string
}

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on: (event: string, callback: (accounts: string[]) => void) => void
}

interface Window {
  ethereum?: EthereumProvider
}
