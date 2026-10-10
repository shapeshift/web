export enum DeviceType {
  Mobile = 'MOBILE',
  Web = 'WEB',
}

export type Device = {
  id: string
  deviceType: DeviceType
  isActive: boolean
}

export type UserAccount = {
  id: string
  accountId: string
  createdAt: string
  userId: string
}

export type User = {
  id: string
  createdAt: string
  updatedAt: string
}

export type GetOrCreateUserRequest = {
  accountIds: string[]
}

export type RegisterDeviceRequest = {
  userId: string
  deviceToken: string
  deviceType: DeviceType
}

export type RegisterDeviceResponse = {
  device: Device
}

export type UserError = {
  message: string
  code?: string
}
