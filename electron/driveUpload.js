// Shared by the browser and Electron: never acknowledge a metadata-only file.
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

async function uploadPdf(request, { fileId, parentId, name, noteId, bytes }) {
  const endpoint = `${UPLOAD_API}/files${fileId ? `/${encodeURIComponent(fileId)}` : ''}?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType,size,webViewLink`;
  const start = await request(endpoint, {
    method: fileId ? 'PATCH' : 'POST',
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'x-upload-content-type': 'application/pdf',
      'x-upload-content-length': String(bytes.byteLength)
    },
    body: JSON.stringify({ name, mimeType: 'application/pdf', ...(fileId ? {} : { parents: [parentId] }), appProperties: { reyPezNoteId: noteId } })
  });
  const location = start.headers.get('location');
  if (!location) throw new Error('Google Drive no inició la carga del PDF. La nota sigue guardada en este equipo.');
  const url = new URL(location);
  if (url.protocol !== 'https:' || url.hostname !== 'www.googleapis.com') throw new Error('Google devolvió una dirección de carga no válida.');
  const complete = await request(location, {
    method: 'PUT', headers: { 'content-type': 'application/pdf' }, body: bytes
  });
  const result = await complete.json();
  if (!result.id) throw new Error('Google Drive no confirmó el archivo. La nota sigue pendiente.');
  const check = await request(`${DRIVE_API}/files/${encodeURIComponent(result.id)}?supportsAllDrives=true&fields=id,name,mimeType,size,webViewLink`);
  const saved = await check.json();
  if (saved.mimeType !== 'application/pdf' || Number(saved.size) !== bytes.byteLength) {
    throw new Error('El PDF en Drive está incompleto. La nota se conserva para volver a subirla.');
  }
  return saved;
}

module.exports = { uploadPdf };
