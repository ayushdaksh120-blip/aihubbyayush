import supabase from './db-client.js';
import { cors, fail } from './auth-helpers.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { data, error } = await supabase.from('models').select('id,display_name,model_id,provider,protocol,description,badge,context_window,is_featured,accent').eq('is_active', true).order('sort_order', { ascending: true }).order('id', { ascending: true });
    if (error) throw error;
    return res.status(200).json(data);
  } catch (err) { return fail(res, err); }
}
