import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import React from 'react'
import { RouteComponentProps } from 'react-router-dom'
import { ActionTypes } from 'context/WalletProvider/actions'

export interface LocationState {
  vault: Vault
  isLegacyWallet?: boolean
  error?: {
    message: string
  }
}

export interface NativeSetupProps
  extends RouteComponentProps<
    {},
    any, // history
    LocationState
  > {
  vault: Vault
  dispatch: React.Dispatch<ActionTypes>
}

export interface LoginResponseError extends Error {
  response: {
    status: number
    data: {
      success: boolean
      error: {
        code: number
        msg: string
      }
    }
  }
}

export interface RateLimitError extends Error {
  response: {
    status: 429
    data: string
  }
}

export const loginErrors = {
  twoFactorRequired: {
    httpCode: 428,
    msg: '2fa required',
  },
  twoFactorInvalid: {
    httpCode: 412,
    msg: '2fa invalid',
  },
  noWallet: {
    httpCode: 404,
    msg: 'no native wallet located for',
  },
  invalidCaptcha: {
    httpCode: 400,
    msg: 'invalid captcha',
  },
}
