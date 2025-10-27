# WalletConnect Wallet - Connecting External Wallets to ShapeShift

## Overview

This feature allows users to connect their existing crypto wallets (like MetaMask, Trust Wallet, Zerion) to ShapeShift. Once connected, users can manage their assets, trade, and interact with DeFi protocols through ShapeShift's interface while keeping their funds secure in their own wallet.

## How It Works

### Current Method: QR Code Connection

1. User clicks "Connect Wallet" in ShapeShift
2. Selects "WalletConnect" option
3. A QR code appears on screen
4. User scans QR code with their mobile wallet app
5. Approves the connection in their wallet
6. ShapeShift can now interact with the wallet (with user approval for each transaction)

[INSERT IMAGE HERE: WalletConnect QR Modal]

### Coming Soon: Direct Connection (Mobile Web Only)

**Status**: In development - [PR #10912](https://github.com/shapeshift/web/pull/10912)

A new streamlined experience for mobile web users:

1. User visits ShapeShift on mobile browser
2. Sees wallet buttons (MetaMask, Trust, Zerion)
3. Taps their wallet of choice
4. Wallet app opens automatically
5. User approves connection
6. Returns to ShapeShift connected

No QR codes needed - just one tap to connect!

[INSERT IMAGE HERE: Direct Connection Buttons]

## Supported Wallets

### Currently Supported
- MetaMask
- Trust Wallet
- Zerion
- Any wallet that supports WalletConnect v2

### Platform Availability
- **Desktop Web**: Full QR code connection support
- **Mobile Web**: QR code support now, direct connection coming soon
- **Mobile App**: Not supported (app is a web wrapper)

## User Benefits

- **Keep Your Keys**: Private keys never leave your wallet
- **Use Your Favorite Wallet**: Works with most popular wallets
- **Full ShapeShift Features**: Trade, swap, earn, and track portfolio
- **Secure**: All transactions require explicit approval in your wallet
- **Multi-Chain**: Connect once, use across multiple blockchains

## Common Use Cases

1. **Trading**: Execute trades on ShapeShift using funds from MetaMask
2. **Portfolio Tracking**: View all assets across connected wallets
3. **DeFi Access**: Interact with DeFi protocols through ShapeShift's interface
4. **Cross-Chain Swaps**: Swap assets across different blockchains

## How to Connect

### Desktop
1. Visit [app.shapeshift.com](https://app.shapeshift.com)
2. Click "Connect Wallet"
3. Choose "WalletConnect"
4. Scan QR code with your mobile wallet
5. Approve in your wallet app

### Mobile (Current)
1. Visit [app.shapeshift.com](https://app.shapeshift.com) on mobile
2. Click "Connect Wallet"
3. Choose "WalletConnect"
4. Copy the connection link
5. Paste in your wallet app
6. Approve connection

### Mobile (Coming Soon with Direct Connection)
1. Visit [app.shapeshift.com](https://app.shapeshift.com) on mobile
2. Click your wallet's button (MetaMask/Trust/Zerion)
3. Wallet app opens automatically
4. Approve connection
5. Return to ShapeShift

## Important Notes

- **Desktop Requirements**: Any modern browser (Chrome, Firefox, Safari, Edge)
- **Mobile Requirements**: Must use `app.shapeshift.com` (not localhost or IP addresses)
- **Security**: Always verify you're on the official ShapeShift domain
- **Disconnecting**: You can disconnect anytime from ShapeShift settings or your wallet

## Troubleshooting

**Connection not working?**
- Ensure you have the latest version of your wallet app
- Check you're on the correct ShapeShift URL
- Try refreshing the page and reconnecting
- On mobile, ensure you're not using private/incognito mode

**Transaction failing?**
- Check you have enough funds for gas fees
- Ensure you're on the correct network in your wallet
- Verify the transaction details before approving

## Future Enhancements

- Direct connection for more wallets
- Desktop direct connection support
- Hardware wallet integration
- Faster connection process

## Support

Need help? Visit our [Discord](https://discord.gg/shapeshift) or check the [GitHub repository](https://github.com/shapeshift/web).

---

*Last Updated: October 2025*