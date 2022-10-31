import type { BaseQueryApi } from '@reduxjs/toolkit/dist/query/baseQueryTypes'

export type ReduxApi = Pick<BaseQueryApi, 'dispatch' | 'getState'>
