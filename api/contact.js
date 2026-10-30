import { onRequestPost, onRequestOptions } from '../functions/api/contact.js';

export const config = {
  runtime: 'edge',
};

export async function POST(request) {
  return onRequestPost({ request, env: process.env });
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
    body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
  });
  const response = await onRequestPost({ request: webReq, env: process.env });
  res.status(response.status);
  response.headers.forEach((val, key) => res.setHeader(key, val));
  const data = await response.text();
  res.send(data);
}
