import React, { useState, useEffect } from 'react';
import { X, Monitor, AppWindow, RefreshCw } from 'lucide-react';
import { DesktopCapturerSource } from '@/types/electron';

interface SourcePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSource: (source: DesktopCapturerSource) => void;
}

export const SourcePickerModal: React.FC<SourcePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectSource,
}) => {
  const [sources, setSources] = useState<DesktopCapturerSource[]>([]);
  const [activeTab, setActiveTab] = useState<'screen' | 'window'>('screen');
  const [loading, setLoading] = useState(false);

  const loadSources = async () => {
    if (!window.electronAPI?.getSources) return;
    setLoading(true);
    try {
      const items = await window.electronAPI.getSources();
      setSources(items);
    } catch (e) {
      console.error('Failed to get sources:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSources();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredSources = sources.filter((s) => {
    if (activeTab === 'screen') {
      return s.id.startsWith('screen:');
    }
    return s.id.startsWith('window:');
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-[#121215] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-100">
              Select Capture Source
            </h2>
            <button
              onClick={loadSources}
              title="Refresh Sources"
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch (Screens vs Windows) */}
        <div className="flex items-center gap-2 px-5 pt-3">
          <button
            onClick={() => setActiveTab('screen')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'screen'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            Screens
          </button>
          <button
            onClick={() => setActiveTab('window')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'window'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <AppWindow className="w-3.5 h-3.5" />
            Windows
          </button>
        </div>

        {/* Sources Grid */}
        <div className="p-5 max-h-[420px] overflow-y-auto">
          {filteredSources.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              {loading ? 'Discovering available displays...' : 'No available capture sources found.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredSources.map((source) => (
                <div
                  key={source.id}
                  onClick={() => {
                    onSelectSource(source);
                    onClose();
                  }}
                  className="group relative cursor-pointer rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-2.5 transition-all hover:border-indigo-500/50 hover:bg-zinc-800/50"
                >
                  <div className="relative aspect-video w-full overflow-hidden rounded bg-black/40 flex items-center justify-center">
                    {source.thumbnail ? (
                      <img
                        src={source.thumbnail}
                        alt={source.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Monitor className="w-8 h-8 text-zinc-600" />
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {source.appIcon && (
                      <img src={source.appIcon} alt="" className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span
                      title={source.name}
                      className="text-xs font-medium text-zinc-300 truncate group-hover:text-zinc-100"
                    >
                      {source.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
