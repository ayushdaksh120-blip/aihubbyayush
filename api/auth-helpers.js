import supabase from './db-client.js';

export async function getUser(req) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data.user;
}

export function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}

export function fail(res, err) {
  console.error('API error:', err);
  return res.status(err.status || 500).json({ error: err.status ? err.message : 'Something went wrong. Please try again.' });
}

export function isAdmin(user) {
  const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const userEmail = user?.email?.trim().toLowerCase();
  return Boolean(ownerEmail && userEmail && ownerEmail === userEmail);
}
