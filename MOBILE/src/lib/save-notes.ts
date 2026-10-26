/**
 * "Download notes": the lesson's notes as a Markdown file. On a phone that
 * means handing the file to the share sheet (save to Files, send to a friend,
 * open in a notes app); the web build downloads it as the website does.
 */
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE, api, fetchText } from '@/core/api';

const safeName = (title: string) => `${(title || 'lesson').replace(/[\\/:*?"<>|\n\r]+/g, ' ').trim().slice(0, 80)} - notes.md`;

export async function saveNotes(lessonId: string, title: string): Promise<void> {
  const name = safeName(title);
  if (Platform.OS === 'web') {
    const blob = await api.notesMarkdown(lessonId);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return;
  }
  const text = await fetchText(`${API_BASE}/lessons/${encodeURIComponent(lessonId)}/notes?format=markdown&download=true`);
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType: 'text/markdown', UTI: 'net.daringfireball.markdown', dialogTitle: name });
}
