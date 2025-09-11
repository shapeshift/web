export type TenderlySimulationRequest = {
  network_id: string
  from: string
  to: string
  input: string
  gas?: number
  gas_price?: string
  value?: string
}

export type TenderlyBalanceChange = {
  address: string
  original: string
  dirty: string
  is_dirty: boolean
}

export type TenderlyAssetChange = {
  token_info: {
    standard: string
    type: string
    contract_address: string
    symbol: string
    name: string
    logo: string
    decimals: number
    dollar_value: string
  }
  type: string
  from: string
  to?: string
  amount: string
  raw_amount: string
  dollar_value: string
  from_before_balance?: string
  to_before_balance?: string
}

export type TenderlyDecodedInput = {
  soltype: {
    name: string
    type: string
    storage_location?: string
    offset?: number
    index?: string
    indexed?: boolean
    simple_type?: {
      type: string
      nested_type?: {
        type: string
      }
    }
    components?: {
      name: string
      type: string
      storage_location?: string
      offset?: number
      index?: string
      indexed?: boolean
      simple_type?: {
        type: string
      }
    }[]
  }
  value: any
}

export type TenderlySimulationResponse = {
  transaction: {
    hash: string
    status: boolean
    error_message?: string
    gas_used: number
    call_trace: {
      calls?: {
        from: string
        to: string
        input: string
        output: string
        gas_used: number
        type: string
        method?: string
      }[]
    }
    transaction_info?: {
      asset_changes?: TenderlyAssetChange[]
      call_trace?: {
        decoded_input?: TenderlyDecodedInput[]
      }
    }
  }
  asset_changes?: TenderlyAssetChange[]
  simulation: {
    id: string
    project_id: string
    owner_id: string
    network_id: string
    block_number: number
    transaction_index: number
    from: string
    to: string
    input: string
    gas: number
    gas_price: string
    gas_used: number
    value: string
    status: boolean
    access_list?: any[]
    method?: string
    decoded_input?: {
      soltype: {
        name: string
        type: string
      }
      value: any
    }[]
    decoded_output?: {
      soltype: {
        name: string
        type: string
      }
      value: any
    }[]
  }
}

export type AssetChange = {
  userAddress: string
  tokenAddress?: string
  amount: string
  rawAmount: string
  type: 'send' | 'receive'
  isNativeAsset: boolean
  symbol: string
  decimals: number
  dollarValue?: string
}

export type ParsedArgument = {
  name: string
  type: string
  value: any
  components?: ParsedArgument[]
}
