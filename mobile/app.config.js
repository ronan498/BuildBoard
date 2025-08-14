import 'dotenv/config';

export default ({ config }) => {
  const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4000';
  process.env.EXPO_PUBLIC_API_BASE_URL = apiUrl;
  return {
    ...config,
    extra: { ...config.extra, apiUrl },
  };
};
