import { onRequestGet, onRequestOptions } from '../functions/api/faq.js';

export const config = {
  runtime: 'edge',
};

export async function GET(request) {
  return onRequestGet({ request, env: process.env });
}

export async function OPTIONS() {
  return onRequestOptions();
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  const fullUrl = `http://${req.headers.host || 'localhost'}${req.url}`;
  const webReq = new Request(fullUrl, {
    method: req.method,
    headers: req.headers,
  });
  const response = await onRequestGet({ request: webReq, env: process.env });
  res.status(response.status);
  response.headers.forEach((val, key) => res.setHeader(key, val));
  const data = await response.text();
  res.send(data);
}
