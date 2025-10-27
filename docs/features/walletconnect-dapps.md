# WalletConnect to dApps - Connect ShapeShift Wallet to DApps

Use ShapeShift as a wallet to connect to any DApp that supports WalletConnect.

**Note**: Currently only works with ShapeShift's native wallet, and Gridplus soon.

## Method 1: Paste Connection Link

1. Go to DApp
2. Choose "WalletConnect"
3. Copy the connection link
4. In ShapeShift: Click "Connect dApp" button
5. Paste link and connect, you're connected!

<img width="498" height="736" alt="image" src="https://github.com/user-attachments/assets/94ea4603-538f-4473-98d0-4e09cd8ffe64" />

## Method 2: Deep Link

NOTE: WC deep link url format is currently off, and correct one has been submitted to WC for review, expect it to be fixed in a few days from time of writing.

DApps can connect directly to ShapeShift:

1. Visit DApp
2. Connect Wallet → WalletConnect → Search "ShapeShift"
3. ShapeShift opens in new tab
4. Approve connection
5. Return to DApp, notice ShapeShift wallet is connected!

URL format: `https://app.shapeshift.com/#/wc?uri={encodedWalletConnectV2Uri}`

<img width="1367" height="833" alt="image" src="https://github.com/user-attachments/assets/714a4d5c-17c2-4751-8934-840a57f31cb0" />
