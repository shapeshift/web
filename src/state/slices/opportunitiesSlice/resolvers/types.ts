import type { BaseQueryApi } from '@reduxjs/toolkit/dist/query/baseQueryTypes'
import type { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'

export type ReduxApi = Pick<BaseQueryApi, 'dispatch' | 'getState'>

export type IDefiProviderToMetadataResolverByDeFiType = {
  [key in DefiProvider]: {
    [key in DefiType]: (args: any) => Promise<any>
  }
}

export type IDefiProviderToDataResolverByDeFiType = {
  [key in DefiProvider]: {
    [key in DefiType]: (args: any) => Promise<any>
  }
}
