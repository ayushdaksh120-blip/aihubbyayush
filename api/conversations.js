import supabase from './db-client.js';
import { cors, fail, getUser } from './auth-helpers.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Please sign in to continue.' });
    if (req.method === 'GET') {
      if (req.query.id) {
        const id = Number(req.query.id);
        if (!Number.isSafeInteger(id)) return res.status(400).json({ error: 'Invalid conversation.' });
        const { data: conversation, error } = await supabase.from('conversations').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
        if (error) throw error;
        if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });
        const { data: messages, error: messageError } = await supabase.from('messages').select('id,conversation_id,role,content,created_at').eq('conversation_id', id).eq('user_id', user.id).order('id', { ascending: true });
        if (messageError) throw messageError;
        return res.status(200).json({ ...conversation, messages });
      }
      const { data, error } = await supabase.from('conversations').select('id,title,model_id,created_at,updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(100);
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const title = String(req.body?.title || 'New conversation').trim().slice(0, 100);
      const modelId = Number(req.body?.model_id);
      const { data: model } = await supabase.from('models').select('id').eq('id', modelId).eq('is_active', true).maybeSingle();
      if (!model) return res.status(400).json({ error: 'Choose an available model.' });
      const { data, error } = await supabase.from('conversations').insert({ user_id: user.id, title, model_id: modelId }).select('*').single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const id = Number(req.body?.id);
      const title = String(req.body?.title || '').trim().slice(0, 100);
      if (!Number.isSafeInteger(id) || !title) return res.status(400).json({ error: 'Enter a valid title.' });
      const { data, error } = await supabase.from('conversations').update({ title, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id).select('*').maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Conversation not found.' });
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const id = Number(req.body?.id);
      if (!Number.isSafeInteger(id)) return res.status(400).json({ error: 'Invalid conversation.' });
      const { data: owned } = await supabase.from('conversations').select('id').eq('id', id).eq('user_id', user.id).maybeSingle();
      if (!owned) return res.status(404).json({ error: 'Conversation not found.' });
      const { error: messagesError } = await supabase.from('messages').delete().eq('conversation_id', id).eq('user_id', user.id);
      if (messagesError) throw messagesError;
      const { error } = await supabase.from('conversations').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { return fail(res, err); }
}
