// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    txOddsApiOrigin: 'https://txline.txodds.com',
    txOddsApiToken: '',
    txOddsGuestJwt: '',
    solanaRpcUrl: 'https://api.mainnet-beta.solana.com',
    predictionMarketRpcUrl: 'https://api.devnet.solana.com',
    public: {
      solanaCluster: 'mainnet-beta',
      txOddsProgramId: '9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA',
      txOddsTokenMint: 'Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL',
      predictionMarketCluster: 'devnet',
      predictionMarketProgramId: '9zgAu5MyTuFsGSU7mCwqQSYNEubmaKaMGyuzuGWyj2qg'
    }
  },

  modules: [
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/fonts',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
    'dayjs-nuxt',
    'nuxt-toast'
  ],

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    classSuffix: ''
  },

  app: {
    head: {
      title: 'CupMarket — World Cup prediction markets',
      meta: [
        { name: 'description', content: 'Trade World Cup outcomes with free-tier fixtures and reference odds from TxODDS TxLINE.' },
        { name: 'theme-color', content: '#07120d' }
      ]
    }
  }
})
