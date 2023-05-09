import dayjs from 'dayjs'

export const mockERHFindByFiatSymbol = {
  changePercent24Hr: 0,
  marketCap: '0',
  price: '0.91',
  volume: '0',
}

export const mockERHPriceHistoryData = [
  { date: dayjs('2020-01-01', 'YYYY-MM-DD').startOf('day').valueOf(), price: 0.891186 },
  { date: dayjs('2020-01-02', 'YYYY-MM-DD').startOf('day').valueOf(), price: 0.891186 },
  { date: dayjs('2020-01-03', 'YYYY-MM-DD').startOf('day').valueOf(), price: 0.895175 },
  { date: dayjs('2020-01-04', 'YYYY-MM-DD').startOf('day').valueOf(), price: 0.895175 },
]
