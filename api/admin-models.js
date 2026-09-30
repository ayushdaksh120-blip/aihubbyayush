import supabase from './db-client.js';
import { cors, fail, getUser, isAdmin } from './auth-helpers.js';

const permitted = ['display_name', 'model_id', 'provider', 'protocol', 'description', 'badge', 'context_window', 'is_active', 'is_featured', 'sort_order', 'accent'];
function normalize(body) {
  const item = {};
  for (const key of permitted) if (Object.prototype.hasOwnProperty.call(body || {}, key)) item[key] = body[key];
  for (const field of ['display_name', 'model_id', 'provider', 'description', 'badge', 'accent']) if (field in item) item[field] = String(item[field] ?? '').trim().slice(0, field === 'description' ? 300 : 120);
  if (item.protocol && !['anthropic', 'openai'].includes(item.protocol)) throw Object.assign(new Error('Invalid protocol.'), { status: 400 });
  if (item.context_window !== undefined) item.context_window = Math.max(0, Math.min(2000000, Number(item.context_window) || 0));
  if (item.sort_order !== undefined) item.sort_order = Math.max(0, Math.min(10000, Number(item.sort_order) || 0));
  if (item.is_active !== undefined) item.is_active = item.is_active === true;
  if (item.is_featured !== undefined) item.is_featured = item.is_featured === true;
  return item;
}
export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Please sign in.' });
    if (!isAdmin(user)) return res.status(403).json({ error: 'Admin access required.' });
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('models').select('*').order('sort_order', { ascending: true }).order('id', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const item = normalize(req.body);
      if (!item.display_name || !item.model_id || !item.provider || !item.protocol) return res.status(400).json({ error: 'Name, model ID, provider, and protocol are required.' });
      const { data, error } = await supabase.from('models').insert(item).select('*').single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const id = Number(req.body?.id);
      if (!Number.isSafeInteger(id)) return res.status(400).json({ error: 'Invalid model.' });
      const item = normalize(req.body);
      if (item.display_name === '' || item.model_id === '' || item.provider === '') return res.status(400).json({ error: 'Required fields cannot be empty.' });
      const { data, error } = await supabase.from('models').update(item).eq('id', id).select('*').maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Model not found.' });
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const id = Number(req.body?.id);
      if (!Number.isSafeInteger(id)) return res.status(400).json({ error: 'Invalid model.' });
      const { data: used } = await supabase.from('conversations').select('id').eq('model_id', id).limit(1);
      if (used?.length) return res.status(400).json({ error: 'This model has conversations. Deactivate it instead to preserve history.' });
      const { error } = await supabase.from('models').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { return fail(res, err); }
}
