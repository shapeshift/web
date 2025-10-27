# WalletConnect to dApps - Connect ShapeShift Wallet to DApps

Use ShapeShift as a wallet to connect to any DApp that supports WalletConnect.

**Note**: Currently only works with ShapeShift's native wallet (not WalletConnect wallets)

## Method 1: Paste Connection Link

1. Go to DApp (Uniswap, OpenSea, etc.)
2. Choose "WalletConnect"
3. Copy the connection link
4. In ShapeShift: Click "Connect dApp" button
5. Paste link and connect

[INSERT IMAGE HERE: Connect dApp Modal]

## Method 2: Deep Link

DApps can connect directly to ShapeShift:

1. Visit DApp
2. Connect Wallet → WalletConnect → Search "ShapeShift"
3. ShapeShift opens in new tab (desktop) or same tab (mobile)
4. Approve connection
5. Return to DApp

URL format: `https://app.shapeshift.com/wc?uri={encodedWalletConnectV2Uri}`

[INSERT IMAGE HERE: DApp Selecting ShapeShift from Wallet List]

## Platform Support

- **Desktop**: Paste link + Deep link
- **Mobile Web**: Paste link + Deep link
- **Mobile App**: Paste link + Deep link

---

*Last Updated: October 2025*