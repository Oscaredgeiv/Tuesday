import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface LibFolder {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  children?: LibFolder[];
  _count?: { documents: number };
}

interface LibDoc {
  id: string;
  title: string;
  slug: string;
  type: string;
  summary: string;
  content: string;
  tags: string[];
  status: string;
  successCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

function LibraryPage() {
  const [folders, setFolders] = useState<LibFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [docs, setDocs] = useState<LibDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<LibDoc | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api.getLibraryFolders().then(d => setFolders(d as LibFolder[])).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedFolder) {
      api.getLibraryFolder(selectedFolder).then((d: any) => setDocs((d.documents ?? []) as LibDoc[])).catch(() => {});
    }
  }, [selectedFolder]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const results = await api.searchLibrary(searchQuery);
    setDocs(results as LibDoc[]);
    setSelectedFolder(null);
  };

  return (
    <div className="flex h-full">
      {/* Folder tree */}
      <div className="w-60 shrink-0 border-r border-border bg-surface-raised overflow-y-auto">
        <div className="p-3">
          <div className="flex items-center gap-2 px-2 py-2 bg-surface border border-border rounded-lg mb-3">
            <span className="text-zinc-600 text-xs">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search library..."
              className="flex-1 bg-transparent text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="px-2 pb-4">
          <p className="px-2 mb-2 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Folders</p>
          {folders.length === 0 ? (
            <p className="px-2 text-xs text-zinc-600">No folders yet.</p>
          ) : (
            <FolderTree folders={folders} selectedId={selectedFolder} onSelect={setSelectedFolder} depth={0} />
          )}
        </div>
      </div>

      {/* Document list */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Library</h2>
            <p className="text-sm text-zinc-500 mt-1">
              {selectedFolder ? `${docs.length} documents` : 'Organized knowledge — small, focused, fast to find.'}
            </p>
          </div>
          <button className="px-3 py-1.5 text-xs bg-tuesday-600 hover:bg-tuesday-500 text-white rounded-lg">
            + New Document
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 pb-6 space-y-2">
          {docs.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-zinc-500">
                {selectedFolder ? 'No documents in this folder.' : 'Select a folder or search to browse.'}
              </p>
              <p className="text-xs text-zinc-600 mt-1">Tip: Use small focused docs — one problem, one solution, one process per document.</p>
            </div>
          ) : docs.map(doc => (
            <button
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedDoc?.id === doc.id ? 'bg-tuesday-600/5 border-tuesday-600/20' : 'bg-surface-raised border-border hover:border-border-active'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <DocTypeIcon type={doc.type} />
                    <p className="text-sm font-medium text-zinc-200 truncate">{doc.title}</p>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{doc.summary}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded">{doc.type}</span>
                    {doc.tags.slice(0, 3).map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 bg-zinc-800/50 text-zinc-600 rounded">{t}</span>)}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  {doc.successCount > 0 && <p className="text-[10px] text-success">{doc.successCount} uses</p>}
                  <p className="text-[10px] text-zinc-700 mt-0.5">{new Date(doc.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Document preview */}
      <div className="w-96 shrink-0 border-l border-border bg-surface-raised overflow-y-auto">
        {selectedDoc ? (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <DocTypeIcon type={selectedDoc.type} />
              <h3 className="text-sm font-semibold text-zinc-200">{selectedDoc.title}</h3>
            </div>
            <p className="text-xs text-zinc-400">{selectedDoc.summary}</p>
            <div className="text-xs text-zinc-400 whitespace-pre-wrap bg-surface p-4 rounded-lg border border-border-subtle max-h-96 overflow-auto leading-relaxed">
              {selectedDoc.content}
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-zinc-500">Type</span><span className="text-zinc-300 capitalize">{selectedDoc.type}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Status</span><span className="text-zinc-300">{selectedDoc.status}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Views</span><span className="text-zinc-300">{selectedDoc.viewCount}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Success uses</span><span className="text-success">{selectedDoc.successCount}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Updated</span><span className="text-zinc-300">{new Date(selectedDoc.updatedAt).toLocaleString()}</span></div>
            </div>
            {selectedDoc.tags.length > 0 && (
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {selectedDoc.tags.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded">{t}</span>)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-zinc-600">Select a document to preview</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FolderTree({ folders, selectedId, onSelect, depth }: { folders: LibFolder[]; selectedId: string | null; onSelect: (id: string) => void; depth: number }) {
  return (
    <div>
      {folders.map(f => (
        <div key={f.id}>
          <button
            onClick={() => onSelect(f.id)}
            className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all ${
              selectedId === f.id ? 'text-tuesday-400 bg-tuesday-600/10' : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface-hover'
            }`}
            style={{ paddingLeft: `${8 + depth * 12}px` }}
          >
            <span className="text-[10px] text-zinc-600">{f.children && f.children.length > 0 ? '▾' : '▸'}</span>
            <span className="truncate">{f.name}</span>
            {f._count?.documents != null && <span className="text-[10px] text-zinc-700 ml-auto">{f._count.documents}</span>}
          </button>
          {f.children && f.children.length > 0 && (
            <FolderTree folders={f.children} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
          )}
        </div>
      ))}
    </div>
  );
}

function DocTypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    solution: '✓', playbook: '▶', decision: '⚖', process: '↻',
    reference: '📌', transcript: '📝', pattern: '◈',
  };
  return <span className="text-xs text-zinc-600">{icons[type] ?? '📄'}</span>;
}

export const Route = createFileRoute('/library')({
  component: LibraryPage,
});
