export type PoolResult = 'W' | 'D' | 'L'

export type BacktestYear = {
  year: string
  return: number
  winRate: number
  matches: number
  drawdown: number
}

export type TeamPool = {
  id: number
  slug: string
  sport: 'Soccer' | 'American Football' | 'Basketball'
  team: string
  shortName: string
  country: string
  icon: string
  nextMatch: string
  volume: string
  liquidity: string
  members: string
  allocation: number
  backtest: number
  annualized: number
  winRate: number
  record: string
  results: PoolResult[]
  fee: string
  hot?: boolean
  history: number[]
  yearly: BacktestYear[]
}

const pools: TeamPool[] = [
  {
    id: 1,
    slug: 'argentina-win',
    sport: 'Soccer',
    team: 'Argentina',
    shortName: 'Argentina Win Pool',
    country: 'National team',
    icon: 'ARG',
    nextMatch: 'vs Colombia · Jul 21',
    volume: '$842.6K',
    liquidity: '$126.4K',
    members: '1,248',
    allocation: 20,
    backtest: 68.4,
    annualized: 14.1,
    winRate: 71,
    record: '7W · 2D · 1L',
    results: ['W', 'W', 'D', 'W', 'W', 'L', 'W', 'W', 'D', 'W'],
    fee: '1.5%',
    hot: true,
    history: [100, 102, 101, 106, 109, 107, 115, 119, 118, 126, 132, 129, 137, 143, 141, 151, 158, 154, 163, 168.4],
    yearly: [
      { year: '2022', return: 11.8, winRate: 67, matches: 15, drawdown: -5.2 },
      { year: '2023', return: 16.4, winRate: 73, matches: 11, drawdown: -4.1 },
      { year: '2024', return: 13.1, winRate: 69, matches: 13, drawdown: -6.8 },
      { year: '2025', return: 18.6, winRate: 75, matches: 12, drawdown: -3.9 },
      { year: '2026', return: 8.5, winRate: 71, matches: 7, drawdown: -2.7 }
    ]
  },
  {
    id: 2,
    slug: 'barcelona-win',
    sport: 'Soccer',
    team: 'Barcelona',
    shortName: 'Barcelona Win Pool',
    country: 'La Liga',
    icon: 'BAR',
    nextMatch: 'vs Valencia · Jul 24',
    volume: '$416.2K',
    liquidity: '$78.1K',
    members: '864',
    allocation: 20,
    backtest: 52.7,
    annualized: 11.2,
    winRate: 66,
    record: '6W · 2D · 2L',
    results: ['W', 'D', 'W', 'L', 'W', 'W', 'D', 'W', 'L', 'W'],
    fee: '2.0%',
    history: [100, 104, 103, 109, 107, 112, 118, 115, 121, 119, 128, 132, 129, 138, 135, 143, 147, 145, 150, 152.7],
    yearly: [
      { year: '2022', return: 8.7, winRate: 63, matches: 38, drawdown: -9.1 },
      { year: '2023', return: 12.2, winRate: 68, matches: 41, drawdown: -7.4 },
      { year: '2024', return: 9.4, winRate: 64, matches: 39, drawdown: -10.2 },
      { year: '2025', return: 12.4, winRate: 70, matches: 40, drawdown: -6.8 },
      { year: '2026', return: 5.1, winRate: 65, matches: 18, drawdown: -4.2 }
    ]
  },
  {
    id: 3,
    slug: 'chiefs-win',
    sport: 'American Football',
    team: 'Kansas City Chiefs',
    shortName: 'Chiefs Win Pool',
    country: 'NFL',
    icon: 'KC',
    nextMatch: 'vs Raiders · Sep 07',
    volume: '$294.8K',
    liquidity: '$52.7K',
    members: '692',
    allocation: 20,
    backtest: 44.2,
    annualized: 9.6,
    winRate: 70,
    record: '7W · 0D · 3L',
    results: ['W', 'W', 'L', 'W', 'W', 'L', 'W', 'W', 'W', 'L'],
    fee: '1.0%',
    history: [100, 105, 110, 106, 112, 116, 111, 118, 122, 126, 121, 129, 133, 130, 137, 134, 140, 143, 141, 144.2],
    yearly: [
      { year: '2022', return: 10.2, winRate: 71, matches: 21, drawdown: -7.2 },
      { year: '2023', return: 7.8, winRate: 67, matches: 21, drawdown: -8.6 },
      { year: '2024', return: 9.8, winRate: 76, matches: 21, drawdown: -5.4 },
      { year: '2025', return: 8.1, winRate: 65, matches: 20, drawdown: -9.2 },
      { year: '2026', return: 3.7, winRate: 70, matches: 10, drawdown: -4.1 }
    ]
  },
  {
    id: 4,
    slug: 'celtics-win',
    sport: 'Basketball',
    team: 'Boston Celtics',
    shortName: 'Celtics Win Pool',
    country: 'NBA',
    icon: 'BOS',
    nextMatch: 'vs Knicks · Oct 18',
    volume: '$188.1K',
    liquidity: '$41.2K',
    members: '571',
    allocation: 20,
    backtest: 76.9,
    annualized: 15.3,
    winRate: 74,
    record: '8W · 0D · 2L',
    results: ['W', 'W', 'W', 'L', 'W', 'W', 'W', 'W', 'L', 'W'],
    fee: '1.5%',
    hot: true,
    history: [100, 103, 108, 112, 110, 118, 123, 121, 130, 136, 133, 142, 149, 145, 154, 160, 157, 168, 172, 176.9],
    yearly: [
      { year: '2022', return: 13.4, winRate: 71, matches: 92, drawdown: -8.2 },
      { year: '2023', return: 14.7, winRate: 73, matches: 96, drawdown: -6.9 },
      { year: '2024', return: 21.3, winRate: 78, matches: 101, drawdown: -5.1 },
      { year: '2025', return: 16.1, winRate: 75, matches: 95, drawdown: -7.3 },
      { year: '2026', return: 7.8, winRate: 74, matches: 42, drawdown: -3.8 }
    ]
  },
  {
    id: 5,
    slug: 'eagles-win',
    sport: 'American Football',
    team: 'Philadelphia Eagles',
    shortName: 'Eagles Win Pool',
    country: 'NFL',
    icon: 'PHI',
    nextMatch: 'vs Cowboys · Sep 11',
    volume: '$121.9K',
    liquidity: '$29.3K',
    members: '438',
    allocation: 15,
    backtest: 31.6,
    annualized: 7.1,
    winRate: 61,
    record: '6W · 0D · 4L',
    results: ['L', 'W', 'W', 'W', 'L', 'W', 'L', 'W', 'W', 'L'],
    fee: '2.5%',
    history: [100, 98, 104, 108, 105, 110, 107, 113, 117, 114, 119, 116, 122, 125, 121, 128, 126, 130, 129, 131.6],
    yearly: [
      { year: '2022', return: 5.8, winRate: 62, matches: 21, drawdown: -9.4 },
      { year: '2023', return: 7.2, winRate: 65, matches: 20, drawdown: -8.1 },
      { year: '2024', return: 7.9, winRate: 60, matches: 20, drawdown: -10.3 },
      { year: '2025', return: 6.4, winRate: 58, matches: 19, drawdown: -11.2 },
      { year: '2026', return: 2.6, winRate: 61, matches: 9, drawdown: -4.8 }
    ]
  },
  {
    id: 6,
    slug: 'lakers-win',
    sport: 'Basketball',
    team: 'Los Angeles Lakers',
    shortName: 'Lakers Win Pool',
    country: 'NBA',
    icon: 'LAL',
    nextMatch: 'vs Suns · Oct 21',
    volume: '$1.24M',
    liquidity: '$209.8K',
    members: '1,506',
    allocation: 20,
    backtest: -3.2,
    annualized: -0.7,
    winRate: 48,
    record: '4W · 0D · 6L',
    results: ['W', 'L', 'L', 'W', 'L', 'W', 'L', 'L', 'W', 'L'],
    fee: '1.5%',
    history: [100, 103, 99, 96, 101, 98, 94, 99, 96, 93, 98, 95, 92, 96, 94, 91, 95, 98, 94, 96.8],
    yearly: [
      { year: '2022', return: 2.1, winRate: 51, matches: 89, drawdown: -13.4 },
      { year: '2023', return: -1.8, winRate: 49, matches: 91, drawdown: -15.2 },
      { year: '2024', return: -3.2, winRate: 47, matches: 94, drawdown: -17.1 },
      { year: '2025', return: 1.4, winRate: 52, matches: 90, drawdown: -12.8 },
      { year: '2026', return: -1.7, winRate: 48, matches: 41, drawdown: -9.1 }
    ]
  }
]

export const usePools = () => {
  const getPool = (slug: string) => pools.find(pool => pool.slug === slug)
  return { pools, getPool }
}
