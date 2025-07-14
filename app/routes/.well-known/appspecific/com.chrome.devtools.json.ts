import { json } from '@remix-run/cloudflare';

export const loader = () => {
  return json({});
};
