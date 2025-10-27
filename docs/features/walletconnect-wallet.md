# WalletConnect Wallet - Connect External Wallets to ShapeShift

Connect external wallets (MetaMask, Trust Wallet, Zerion, etc.) to ShapeShift using WalletConnect.

## Current Methods

### Desktop: QR Code
1. Click "Connect Wallet" → "WalletConnect"
2. Scan QR code with mobile wallet
3. Approve connection

### Mobile Web: Deep Link via WalletConnect Modal
1. Click "Connect Wallet" → "WalletConnect"
2. WalletConnect modal shows wallet options
3. Tap wallet → app opens via deep link
4. Approve and return to ShapeShift

Works in mobile browsers and even in-app browsers (like MetaMask mobile browser)!

[INSERT IMAGE HERE: WalletConnect Modal on Mobile]

## Coming Soon: Direct Connection (Mobile Web Only)

**Status**: Initial implementation in [PR #10879](https://github.com/shapeshift/web/pull/10879), landing in [PR #10912](https://github.com/shapeshift/web/pull/10912)

Skip the WalletConnect modal step entirely - wallet buttons shown directly in ShapeShift's UI:

1. See wallet buttons right in ShapeShift (MetaMask, Trust, Zerion)
2. Tap wallet → app opens
3. Approve → return to ShapeShift

**Difference from current**: No WalletConnect modal at all - buttons are part of ShapeShift's interface

**Exploring for iOS**: Automatic detection of installed wallets - spike in progress ([#10893](https://github.com/shapeshift/web/issues/10893))

**Demo**: [Direct Connection Video](https://github.com/user-attachments/assets/c72816f5-3683-4c91-b964-c516b84f199e)

## Supported Wallets

- MetaMask
- Trust Wallet
- Zerion
- Any WalletConnect v2 compatible wallet

## Platform Support

- **Desktop**: QR code
- **Mobile Web**: Deep link via WalletConnect modal + Direct Connection (coming)
- **Mobile App**: Not supported

---

*Last Updated: October 2025*