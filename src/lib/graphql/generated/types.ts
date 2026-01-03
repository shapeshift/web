export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  AccountId: { input: any; output: any; }
  AssetId: { input: any; output: any; }
};

export type Account = {
  assetId: Scalars['String']['output'];
  balance: Scalars['String']['output'];
  chainId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  pubkey: Scalars['String']['output'];
  tokens: Array<TokenBalance>;
};

export type MarketData = {
  assetId: Scalars['String']['output'];
  changePercent24Hr: Scalars['Float']['output'];
  marketCap: Scalars['String']['output'];
  maxSupply?: Maybe<Scalars['String']['output']>;
  price: Scalars['String']['output'];
  supply?: Maybe<Scalars['String']['output']>;
  volume: Scalars['String']['output'];
};

export type PageInfo = {
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
};

export type Query = {
  accounts: Array<Maybe<Account>>;
  health: Scalars['String']['output'];
  marketData: Array<Maybe<MarketData>>;
  transactions: TransactionConnection;
};


export type QueryAccountsArgs = {
  accountIds: Array<Scalars['String']['input']>;
};


export type QueryMarketDataArgs = {
  assetIds: Array<Scalars['String']['input']>;
};


export type QueryTransactionsArgs = {
  accountIds: Array<Scalars['String']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type TokenBalance = {
  assetId: Scalars['String']['output'];
  balance: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  precision?: Maybe<Scalars['Int']['output']>;
  symbol?: Maybe<Scalars['String']['output']>;
};

export type Transaction = {
  blockHeight?: Maybe<Scalars['Int']['output']>;
  blockTime?: Maybe<Scalars['Int']['output']>;
  fee?: Maybe<Scalars['String']['output']>;
  pubkey: Scalars['String']['output'];
  status: Scalars['String']['output'];
  transfers: Array<TxTransfer>;
  txid: Scalars['String']['output'];
};

export type TransactionConnection = {
  edges: Array<TransactionEdge>;
  pageInfo: PageInfo;
};

export type TransactionEdge = {
  accountId: Scalars['String']['output'];
  cursor: Scalars['String']['output'];
  node: Transaction;
};

export type TxTransfer = {
  assetId: Scalars['String']['output'];
  from: Array<Scalars['String']['output']>;
  to: Array<Scalars['String']['output']>;
  type: Scalars['String']['output'];
  value: Scalars['String']['output'];
};
