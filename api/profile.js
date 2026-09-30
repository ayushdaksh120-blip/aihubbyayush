import supabase from './db-client.js';
import { cors, fail, getUser, isAdmin } from './auth-helpers.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Please sign in to continue.' });
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('profiles').select('user_id,role,display_name').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      const profile = data || { user_id: user.id, role: 'USER', display_name: user.email?.split('@')[0] };
      return res.status(200).json({ ...profile, role: isAdmin(user) ? 'ADMIN' : 'USER' });
    }
    if (req.method === 'PUT') {
      const displayName = String(req.body?.display_name || '').trim().slice(0, 60);
      if (!displayName) return res.status(400).json({ error: 'A display name is required.' });
      const { data, error } = await supabase.from('profiles').upsert(
        { user_id: user.id, role: isAdmin(user) ? 'ADMIN' : 'USER', display_name: displayName },
        { onConflict: 'user_id' }
      ).select('user_id,role,display_name').single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { return fail(res, err); }
}
