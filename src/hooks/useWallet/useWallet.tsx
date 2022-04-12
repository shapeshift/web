import React, { useContext } from 'react'
import { IWalletContext, WalletContext } from 'context/WalletProvider/WalletContext'

export const useWallet = (): IWalletContext =>
  useContext(WalletContext as React.Context<IWalletContext>)
