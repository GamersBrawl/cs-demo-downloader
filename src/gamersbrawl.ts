import axios from 'axios';

const BASE_URL = 'https://api.gamersbrawl.com/api/v1';

export const updateLastShareCode = async (steamId: string, shareCode: string): Promise<void> => {
  const headers = {
    'X-API-Token': '117cb41fec941f9d746e1a9f73197d14f3f8c2fb5aa301ec6a49baef2db0bb7a',
  };
  await axios.patch(
    `${BASE_URL}/update_match_id/`,
    { provider_id: steamId, match_id: shareCode },
    { headers },
  );
};

export const getAuthCodes = async () => {
  const response = await axios.get(`${BASE_URL}/counter_strike_users/`);
  return response.data;
};
