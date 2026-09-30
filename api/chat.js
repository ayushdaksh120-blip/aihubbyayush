import supabase from './db-client.js';
import { cors, fail, getUser } from './auth-helpers.js';
import { abhiBotsService } from './abhiBotsService.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Please sign in to continue.' });
    const content = String(req.body?.content || '').trim();
    const modelId = Number(req.body?.model_id);
    const conversationId = req.body?.conversation_id ? Number(req.body.conversation_id) : null;
    if (!content || content.length > 12000) return res.status(400).json({ error: 'Message must be between 1 and 12,000 characters.' });
    if (!Number.isSafeInteger(modelId) || (conversationId && !Number.isSafeInteger(conversationId))) return res.status(400).json({ error: 'Invalid request.' });
    if (!process.env.ABHIBOTS_API_KEY) return res.status(503).json({ error: 'AI is not configured yet. Add ABHIBOTS_API_KEY in the Secrets tab.' });
    const { data: model, error: modelError } = await supabase.from('models').select('*').eq('id', modelId).eq('is_active', true).maybeSingle();
    if (modelError) throw modelError;
    if (!model) return res.status(400).json({ error: 'This model is unavailable. Choose another model.' });
    let conversation;
    if (conversationId) {
      const { data, error } = await supabase.from('conversations').select('*').eq('id', conversationId).eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Conversation not found.' });
      conversation = data;
    } else {
      const { data, error } = await supabase.from('conversations').insert({ user_id: user.id, title: content.split('\n')[0].slice(0, 55), model_id: modelId }).select('*').single();
      if (error) throw error;
      conversation = data;
    }
    const { data: history, error: historyError } = await supabase.from('messages').select('role,content').eq('conversation_id', conversation.id).eq('user_id', user.id).order('id', { ascending: false }).limit(30);
    if (historyError) throw historyError;
    const context = [...history.reverse(), { role: 'user', content }];
    const { content: answer } = await abhiBotsService({ model, messages: context });
    const { data: inserted, error: insertError } = await supabase.from('messages').insert([
      { conversation_id: conversation.id, user_id: user.id, role: 'user', content },
      { conversation_id: conversation.id, user_id: user.id, role: 'assistant', content: answer },
    ]).select('id,conversation_id,role,content,created_at');
    if (insertError) throw insertError;
    const { error: updateError } = await supabase.from('conversations').update({ model_id: modelId, updated_at: new Date().toISOString() }).eq('id', conversation.id).eq('user_id', user.id);
    if (updateError) throw updateError;
    return res.status(200).json({ conversation_id: conversation.id, messages: inserted });
  } catch (err) { return fail(res, err); }
}
