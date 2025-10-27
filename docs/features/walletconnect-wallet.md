# WalletConnect Wallet - Connect External Wallets to ShapeShift

Connect external wallets (MetaMask, Trust Wallet, Zerion, etc.) to ShapeShift using WalletConnect.

## Current Method: QR Code

1. Click "Connect Wallet" → "WalletConnect"
2. QR code appears
3. Scan with wallet app
4. Approve connection

[INSERT IMAGE HERE: WalletConnect QR Modal]

## Coming Soon: Direct Connection (Mobile Web Only)

**Status**: [PR #10912](https://github.com/shapeshift/web/pull/10912)

Skip the WalletConnect modal - popular wallets shown directly:

1. See wallet buttons (MetaMask, Trust, Zerion)
2. Tap wallet → app opens
3. Approve → return to ShapeShift

**Next for iOS**: Automatic detection of installed wallets ([#10893](https://github.com/shapeshift/web/issues/10893))

[INSERT IMAGE HERE: Direct Connection Buttons]

## Supported Wallets

- MetaMask
- Trust Wallet
- Zerion
- Any WalletConnect v2 compatible wallet

## Platform Support

- **Desktop**: QR code
- **Mobile Web**: QR code + Direct Connection (coming)
- **Mobile App**: Not supported

---

*Last Updated: October 2025*