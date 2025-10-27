# WalletConnect dApps - Connecting ShapeShift to DApps

## Overview

This feature allows ShapeShift users to connect to any decentralized application (DApp) that supports WalletConnect. Users can interact with popular DApps like Uniswap, OpenSea, Aave, and hundreds of others while using ShapeShift as their wallet.

## How It Works

ShapeShift acts as a WalletConnect-compatible wallet. When you connect to a DApp:
1. The DApp sends transaction requests to ShapeShift
2. ShapeShift shows you what the DApp wants to do
3. You approve or reject the request
4. If approved, ShapeShift executes the transaction

## Connection Methods

### Method 1: Paste Connection Link

1. Go to any DApp (Uniswap, OpenSea, etc.)
2. Choose "WalletConnect" as connection method
3. Copy the WalletConnect link
4. In ShapeShift: Settings → WalletConnect to DApps
5. Paste the link and connect
6. Choose which accounts and networks to share with the DApp

[INSERT IMAGE HERE: Paste WalletConnect Link Modal]

### Method 2: Direct Deep Link

The smoothest experience - DApps can connect directly to ShapeShift:

1. Visit any DApp in your browser
2. Click "Connect Wallet" → Select "ShapeShift"
3. Automatically redirects to ShapeShift
4. Approve the connection
5. Start using the DApp with ShapeShift

This works on:
- **Desktop**: Opens ShapeShift in a new tab
- **Mobile Web**: Opens ShapeShift mobile web
- **Mobile App**: Opens ShapeShift app via deep link

[INSERT IMAGE HERE: DApp Selecting ShapeShift from Wallet List]

## Supported DApps

Any DApp that supports WalletConnect v2, including:

### Popular DeFi Platforms
- Uniswap (trading)
- Aave (lending/borrowing)
- Compound (lending/borrowing)
- Curve (stablecoin swaps)

### NFT Marketplaces
- OpenSea
- Blur
- LooksRare
- Rarible

### Gaming & Metaverse
- Axie Infinity
- Decentraland
- The Sandbox

### And hundreds more!

## User Benefits

- **One Wallet, All DApps**: Use ShapeShift for all your DApp interactions
- **Security**: Review every transaction before signing
- **Multi-Chain**: Works across Ethereum, BSC, Polygon, and more
- **Session Management**: Connect to multiple DApps simultaneously
- **Transaction Preview**: See exactly what you're signing

## How Users Connect

### From Desktop
1. Open any DApp website
2. Click "Connect Wallet"
3. Choose WalletConnect or ShapeShift
4. Follow connection flow
5. Approve in ShapeShift

### From Mobile Browser
1. Visit DApp on mobile browser
2. Select ShapeShift from wallet options
3. ShapeShift app/web opens
4. Approve connection
5. Return to DApp

### Interesting Use Case
Users can even connect to DApps from within other wallet browsers! For example:
- Open MetaMask mobile browser
- Visit a DApp
- Connect using ShapeShift via WalletConnect
- Use ShapeShift for signing while browsing in MetaMask

## What Users Can Do

Once connected, users can:
- **Trade tokens** on DEXes
- **Buy and sell NFTs**
- **Lend and borrow** crypto
- **Provide liquidity** to pools
- **Play blockchain games**
- **Vote in governance** proposals
- **Interact with smart contracts**

All while keeping their assets secure in ShapeShift!

## Security Features

- **Domain Display**: Always shows which DApp is requesting actions
- **Transaction Preview**: See what you're signing before approval
- **Session Control**: Disconnect from DApps anytime
- **Permission Scope**: DApps only see what you explicitly share
- **No Private Keys**: DApps never access your private keys

## Managing Connections

### View Active Connections
Settings → WalletConnect to DApps → Active Sessions

### Disconnect from a DApp
1. Go to Active Sessions
2. Find the DApp
3. Click Disconnect

### Security Best Practices
- Only connect to trusted DApps
- Verify the DApp's URL
- Review all transaction requests carefully
- Disconnect when not in use
- Never share your seed phrase

## Platform Support

- **Desktop Web**: Full support
- **Mobile Web**: Full support
- **Mobile App**: Deep link support only (receives connections)

## Common Questions

**Can I connect to multiple DApps?**
Yes! ShapeShift can maintain multiple DApp connections simultaneously.

**Is it safe?**
Yes, DApps never receive your private keys. You approve each transaction individually.

**Which blockchains work?**
All EVM chains (Ethereum, BSC, Polygon, etc.) and Cosmos chains.

**Can I use this on mobile?**
Yes, on mobile web browsers. The mobile app can receive deep links.

## Troubleshooting

**DApp connection not showing?**
- Ensure your wallet is unlocked in ShapeShift
- Check you copied the correct WalletConnect link
- Try refreshing both ShapeShift and the DApp

**Transaction failing?**
- Verify you have enough funds for gas
- Check you're on the correct network
- Ensure the DApp is requesting a valid transaction

## Future Enhancements

- In-app DApp browser
- Featured DApps directory
- Quick connect to popular DApps
- Enhanced transaction simulation

## Support

Need help? Visit our [Discord](https://discord.gg/shapeshift) or check the [GitHub repository](https://github.com/shapeshift/web).

---

*Last Updated: October 2025*