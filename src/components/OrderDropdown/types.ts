export enum OrderOptionsKeys {
  ASCENDING = 'Ascending',
  DESCENDING = 'Descending',
}

export type OrderOption = {
  key: OrderOptionsKeys
  label: string
}
