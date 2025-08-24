const fs = require('fs');
const supabase = require('../lib/supabase');

const BUCKET = process.env.SUPABASE_BUCKET || 'user-files';

const uploadLocalFileToSupabase = async (localPath, destKey, contentType) => {
  const fileBuffer = await fs.promises.readFile(localPath);
  const { error } = await supabase.storage.from(BUCKET).upload(destKey, fileBuffer, {
    contentType: contentType || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw error;
  return destKey;
};

// New: upload buffer directly (no temp files)
const uploadBufferToSupabase = async (buffer, destKey, contentType) => {
  const { error } = await supabase.storage.from(BUCKET).upload(destKey, buffer, {
    contentType: contentType || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw error;
  return destKey;
};

const getSignedUrl = async (key, expiresIn = 3600) => {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(key, expiresIn);
  if (error) throw error;
  return data.signedUrl;
};

const removeObjects = async (keys) => {
  if (!keys?.length) return;
  const { error } = await supabase.storage.from(BUCKET).remove(keys);
  if (error) throw error;
};

module.exports = { uploadLocalFileToSupabase, uploadBufferToSupabase, getSignedUrl, removeObjects };