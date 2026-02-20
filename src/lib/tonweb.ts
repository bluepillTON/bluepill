import TonWeb from 'tonweb';

const API_KEY = 'ae014a526d009bfc8fd9f000ea506eb3165a7253a46a1f24fd0e651abb68985b'; // get from https://toncenter.com
const endpoint = 'https://testnet.toncenter.com/api/v2/jsonRPC'; // or testnet.toncenter.com

export const tonweb = new TonWeb(
  new TonWeb.HttpProvider(endpoint, { apiKey: API_KEY })
);