# WalletConnect Feature Documentation

## What is WalletConnect?

WalletConnect is the industry standard protocol that allows ShapeShift to securely connect with external wallets and decentralized applications (DApps). Think of it as a bridge that enables secure communication without ever sharing private keys.

## How ShapeShift Uses WalletConnect

ShapeShift implements WalletConnect in two ways:

### 1. [WalletConnect Wallet](./walletconnect-wallet.md)
Connect ShapeShift to external wallets like MetaMask, Trust Wallet, and Zerion. Users can manage their crypto assets stored in these wallets directly through ShapeShift's interface.

### 2. [WalletConnect dApps](./walletconnect-dapps.md)
Allow external DApps (like Uniswap, OpenSea, Aave) to connect to ShapeShift. Users can interact with these DApps while using ShapeShift as their wallet.

## Platform Support

| Feature | Desktop Web | Mobile Web | Native Mobile App |
|---------|------------|------------|-------------------|
| **WalletConnect Wallet** | ✅ Yes | ✅ Yes | ❌ No |
| **WalletConnect Wallet - Direct Connection** | ❌ No | 🚧 Coming Soon | ❌ No |
| **WalletConnect dApps (Paste Link)** | ✅ Yes | ✅ Yes | ❌ No |
| **WalletConnect dApps (Deep Link)** | ❌ N/A | ✅ Yes | ✅ Yes* |

\* The mobile app can receive deep links and route them to the web interface

## What's New

### Direct Wallet Connection (Coming Soon)
- **Status**: In development for mobile web ([PR #10912](https://github.com/shapeshift/web/pull/10912))
- **What it does**: Skip the QR code step and connect directly to MetaMask, Trust Wallet, or Zerion with one tap
- **Where**: Mobile web browsers only (initially)
- **Why it matters**: Faster, smoother user experience on mobile devices

## Key Benefits

- **Security**: Never share private keys - all signing happens in the user's wallet
- **Flexibility**: Use ShapeShift with any WalletConnect-compatible wallet
- **Interoperability**: Access any DApp through ShapeShift's interface
- **Multi-platform**: Works across desktop and mobile web browsers

## Learn More

- **[WalletConnect Wallet Guide](./walletconnect-wallet.md)** - How to connect external wallets to ShapeShift
- **[WalletConnect dApps Guide](./walletconnect-dapps.md)** - How to connect ShapeShift to DApps

## Resources

- [ShapeShift Web Repository](https://github.com/shapeshift/web)
- [ShapeShift Mobile App Repository](https://github.com/shapeshift/mobile-app)
- [WalletConnect Official Site](https://walletconnect.com)

---

*Last Updated: October 2025*