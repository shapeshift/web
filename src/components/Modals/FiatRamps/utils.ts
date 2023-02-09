export const middleEllipsis = (address: string, cut: number) =>
  `${address.slice(0, cut)}...${address.slice(-1 * cut)}`
