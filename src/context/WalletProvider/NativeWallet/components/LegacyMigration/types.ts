export type NativeWalletValues = {
  name: string
  password: string
  email: string
  twoFactorCode: string
  mnemonic: string
  message: string
  confirmPassword: string
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

export const LoginErrors = {
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
    msg: 'no ShapeShift wallet located for',
  },
  invalidCaptcha: {
    httpCode: 400,
    msg: 'invalid captcha',
  },
}
