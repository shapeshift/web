import { createApi } from '@reduxjs/toolkit/query/react'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'

export const swapperApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'swapperApi',
  endpoints: () => ({}),
})
