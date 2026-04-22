import { GoogleAuthService } from './GoogleAuthService';

const DRIVE_UPLOAD   = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_FILES    = 'https://www.googleapis.com/drive/v3/files';
const FILENAME       = 'my-library-backup.json';
const FILENAME_PREV  = 'my-library-backup-prev.json';
const BOUNDARY       = 'MYLIBRARY_BACKUP_BOUNDARY';

class GoogleDriveServiceClass {
  private async bearerHeader(): Promise<string> {
    const token = await GoogleAuthService.getValidAccessToken();
    if (!token) throw new Error('Not authenticated with Google');
    return `Bearer ${token}`;
  }

  private async findFileId(name: string): Promise<string | null> {
    const auth = await this.bearerHeader();
    const q    = encodeURIComponent(`name='${name}' and trashed=false`);
    const res  = await fetch(`${DRIVE_FILES}?q=${q}&fields=files(id)`, {
      headers: { Authorization: auth },
    });
    if (!res.ok) return null;
    const data = await res.json() as { files: Array<{ id: string }> };
    return data.files?.[0]?.id ?? null;
  }

  private async deleteFile(fileId: string): Promise<void> {
    const auth = await this.bearerHeader();
    await fetch(`${DRIVE_FILES}/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: auth },
    });
  }

  private async renameFile(fileId: string, newName: string): Promise<void> {
    const auth = await this.bearerHeader();
    await fetch(`${DRIVE_FILES}/${fileId}`, {
      method: 'PATCH',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
  }

  /**
   * Uploads jsonContent to Google Drive with 2-backup rotation:
   *   my-library-backup-prev.json  ← old backup (deleted then replaced by current)
   *   my-library-backup.json       ← new backup (freshly uploaded)
   */
  async uploadBackup(jsonContent: string): Promise<void> {
    const auth = await this.bearerHeader();

    // Rotation: delete prev → rename current → prev
    const [currentId, prevId] = await Promise.all([
      this.findFileId(FILENAME),
      this.findFileId(FILENAME_PREV),
    ]);
    if (prevId)   await this.deleteFile(prevId);
    if (currentId) await this.renameFile(currentId, FILENAME_PREV);

    // Upload new backup
    const metadata = JSON.stringify({ name: FILENAME, mimeType: 'application/json' });
    const body =
      `--${BOUNDARY}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      metadata +
      `\r\n--${BOUNDARY}\r\nContent-Type: application/json\r\n\r\n` +
      jsonContent +
      `\r\n--${BOUNDARY}--`;

    const res = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart`, {
      method: 'POST',
      headers: {
        Authorization:  auth,
        'Content-Type': `multipart/related; boundary=${BOUNDARY}`,
      },
      body,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Drive upload failed (${res.status}): ${err}`);
    }
  }

  async downloadBackup(): Promise<string> {
    const auth   = await this.bearerHeader();
    const fileId = await this.findFileId(FILENAME);
    if (!fileId) throw new Error('Nessun backup trovato su Google Drive.');
    const res = await fetch(`${DRIVE_FILES}/${fileId}?alt=media`, {
      headers: { Authorization: auth },
    });
    if (!res.ok) throw new Error(`Drive download failed (${res.status})`);
    return res.text();
  }
}

export const GoogleDriveService = new GoogleDriveServiceClass();
