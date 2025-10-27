# WalletConnect Wallet - Connect External Wallets to ShapeShift

Connect external wallets (MetaMask, Trust Wallet, Zerion, etc.) to ShapeShift using WalletConnect.

## Current supported Methods

### Desktop: QR Code
1. Click "Connect Wallet" → "WalletConnect"
2. Scan QR code with mobile wallet
3. You're now connected and can sign Txs etc

<img width="1728" height="1004" alt="image" src="https://github.com/user-attachments/assets/227271d7-27fa-407a-bda0-c594d33fedbe" />


### Mobile Web: Deep Link via WalletConnect Modal
1. Click "Connect Wallet" → "WalletConnect"
2. WalletConnect modal opens and shows diff wallet options
3. Tap your preferred wallet → said wallet app opens via deep link
4. Approve in app and return to ShapeShift, you're connected

<img width="645" height="1294" alt="TradeBridge  ShapeShift" src="https://github.com/user-attachments/assets/5a6434a6-b2e6-45a4-af14-a7d14249c1fb" />


Works in mobile browsers and even in-app browsers (e.g MM mobile browser)!

## Coming Soon: Direct Connection (Mobile Web Only)

**Status**: Initial implementation in [PR #10879](https://github.com/shapeshift/web/pull/10879), landing soon in [PR #10912](https://github.com/shapeshift/web/pull/10912)

Skip the WalletConnect modal step entirely - wallet buttons shown directly in ShapeShift's UI:

1. See a list or predefined wallet buttons right in ShapeShift (MetaMask, Trust, Zerion for now)
2. Tap wallet → app opens directly, skipping the WC modal step altogether
3. Approve in app → return to ShapeShift and you're in 

![IMG_6103](https://github.com/user-attachments/assets/dbf62599-dd21-44ff-88e5-bd01744e5d0a)

https://github.com/user-attachments/assets/c72816f5-3683-4c91-b964-c516b84f199e
