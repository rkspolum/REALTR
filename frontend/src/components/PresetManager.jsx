import { useState } from 'react';
import { BookmarkPlus, Trash2 } from 'lucide-react';

const STORAGE_KEY = 'redfin_screener_presets';

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function save(presets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export default function PresetManager({ currentFilters, onLoad }) {
  const [presets, setPresets] = useState(load);
  const [inputVisible, setInputVisible] = useState(false);
  const [name, setName] = useState('');

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const updated = [...presets, { name: trimmed, filters: currentFilters, savedAt: new Date().toISOString() }];
    setPresets(updated);
    save(updated);
    setName('');
    setInputVisible(false);
  }

  function handleDelete(i) {
    const updated = presets.filter((_, idx) => idx !== i);
    setPresets(updated);
    save(updated);
  }

  return (
    <div>
      <label className="filter-label">Saved Presets</label>

      {presets.length === 0 && !inputVisible && (
        <p className="text-xs text-gray-400 italic mb-2">No presets saved yet</p>
      )}

      {presets.length > 0 && (
        <div className="space-y-1 mb-2">
          {presets.map((p, i) => (
            <div key={i} className="flex items-center gap-1">
              <button
                onClick={() => onLoad(p.filters)}
                title={`Saved ${new Date(p.savedAt).toLocaleDateString()}`}
                className="flex-1 text-left text-xs px-2 py-1.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded transition-colors truncate"
              >
                {p.name}
              </button>
              <button onClick={() => handleDelete(i)} className="p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {inputVisible ? (
        <div className="flex gap-1">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') { setInputVisible(false); setName(''); }
            }}
            placeholder="Preset name…"
            className="filter-input flex-1 text-xs"
            autoFocus
          />
          <button onClick={handleSave} className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded">
            Save
          </button>
        </div>
      ) : (
        <button
          onClick={() => setInputVisible(true)}
          className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 border border-dashed border-gray-300 hover:border-blue-400 hover:text-blue-600 text-gray-400 rounded transition-colors"
        >
          <BookmarkPlus size={12} /> Save current filters
        </button>
      )}
    </div>
  );
}
