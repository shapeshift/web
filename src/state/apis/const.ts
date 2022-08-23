import { fakeBaseQuery } from '@reduxjs/toolkit/dist/query/react'

// https://redux-toolkit.js.org/rtk-query/api/createApi#parameters
export const BASE_RTK_CREATE_API_CONFIG = {
  // not actually used, only used to satisfy createApi, we use a custom queryFn
  baseQuery: fakeBaseQuery(),
  // refetch if network connection is dropped, useful for mobile
  refetchOnReconnect: true,
}
