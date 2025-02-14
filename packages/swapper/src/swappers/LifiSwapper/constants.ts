export enum LifiStatusMessage {
  BridgeWaitingForConfirmations = 'The bridge deposit has been received. The bridge is waiting for more confirmations to start the off-chain logic.',
  BridgeOffChainExecution = 'The bridge off-chain logic is being executed. Wait for the transaction to appear in the destination chain.',
  BridgeComplete = 'The transfer is complete.',
}
