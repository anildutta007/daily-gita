import React, { useState } from 'react';
import { Shloka } from '../types';
import { GITA_SHLOKAS } from '../data/shlokas';
import { CHAPTER_METADATA } from '../data/chapterMeta';
import { BookOpen, Search, Bookmark, ChevronRight } from 'lucide-react';

interface ChapterBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectShloka: (shlokaIndex: number) => void;
  completedIds: number[];
  bookmarkedIds: number[];
}

export const ChapterBrowserModal: React.FC<ChapterBrowserModalProps> = ({
  isOpen,
  onClose,
  onSelectShloka,
  completedIds,
  bookmarkedIds
}) => {
  const [selectedChapter, setSelectedChapter] = useState<number>(2);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const currentChapterInfo = CHAPTER_METADATA.find(c => c.chapter === selectedChapter) || CHAPTER_METADATA[1];
  const chapterShlokas = GITA_SHLOKAS.filter(s => s.chapter === selectedChapter);

  const filteredShlokas = searchQuery
    ? GITA_SHLOKAS.filter(s =>
        s.englishMeaning.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.hindiMeaning.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.transliteration.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.theme && s.theme.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : chapterShlokas;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-amber-200">The 18 Chapters of Bhagavad Gita</h2>
              <p className="text-xs text-slate-400">Explore themes and jump directly to any verse</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-2 text-xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Search Bar */}
        <div className="pt-4 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search across all verses by keyword (e.g. soul, peace, karma, surrender)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm focus:outline-none focus:border-amber-400 placeholder-slate-500"
            />
          </div>
        </div>

        {/* Chapter Carousel Buttons */}
        {!searchQuery && (
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-thin shrink-0 border-b border-slate-800">
            {CHAPTER_METADATA.map((chap) => {
              const isSelected = selectedChapter === chap.chapter;
              const hasVerses = GITA_SHLOKAS.some(s => s.chapter === chap.chapter);
              return (
                <button
                  key={chap.chapter}
                  onClick={() => setSelectedChapter(chap.chapter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold'
                      : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>Ch. {chap.chapter}</span>
                  {hasVerses && <span className="ml-1 text-[10px] opacity-75">✨</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Chapter Summary if browsing by chapter */}
        {!searchQuery && (
          <div className="py-3 px-4 bg-slate-950/40 rounded-2xl border border-slate-800/80 my-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">
                Chapter {currentChapterInfo.chapter}: {currentChapterInfo.nameSanskrit}
              </span>
              <span className="text-xs text-slate-400 font-hindi">
                {currentChapterInfo.nameHindi}
              </span>
            </div>
            <div className="text-sm font-semibold text-slate-200 mt-0.5">
              {currentChapterInfo.nameEnglish}
            </div>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
              {currentChapterInfo.summary}
            </p>
          </div>
        )}

        {/* Shloka List in selected chapter or search */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-2">
          {filteredShlokas.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No verses found matching your search.
            </div>
          ) : (
            filteredShlokas.map((shloka) => {
              const globalIndex = GITA_SHLOKAS.findIndex(s => s.id === shloka.id);
              const isDone = completedIds.includes(shloka.id);
              const isBookmarked = bookmarkedIds.includes(shloka.id);

              return (
                <div
                  key={shloka.id}
                  onClick={() => {
                    onSelectShloka(globalIndex);
                    onClose();
                  }}
                  className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/40 transition-all cursor-pointer group flex items-start justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-mono font-bold">
                        Chapter {shloka.chapter}, Verse {shloka.verse}
                      </span>
                      {shloka.theme && (
                        <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                          {shloka.theme}
                        </span>
                      )}
                      {isDone && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                          Read
                        </span>
                      )}
                      {isBookmarked && (
                        <Bookmark className="w-3.5 h-3.5 text-amber-400 fill-current" />
                      )}
                    </div>

                    <div className="text-sm font-serif text-amber-100 line-clamp-1">
                      {shloka.sanskrit.split('\n')[0]}
                    </div>
                    <div className="text-xs text-slate-300 line-clamp-2">
                      {shloka.englishMeaning}
                    </div>
                    <div className="text-xs text-slate-400 font-hindi line-clamp-1">
                      {shloka.hindiMeaning}
                    </div>
                  </div>

                  <div className="flex items-center self-center text-slate-500 group-hover:text-amber-400 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
