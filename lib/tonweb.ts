import TonWeb from 'tonweb';
const API_KEY = 'YOUR_TONCENTER_API_KEY'; // get from https://toncenter.com
const endpoint = 'https://toncenter.com/api/v2/jsonRPC'; // or testnet
export const tonweb = new TonWeb(new TonWeb.HttpProvider(endpoint, { apiKey: API_KEY }));