import React, { useState } from 'react';
import { PATCH_NOTES, PatchNote } from '../../data/patchNotes';
import { ChevronLeft, ChevronRight, FileText, Sparkles, Clock } from 'lucide-react';

const ITEMS_PER_PAGE = 20;

export const PatchNotesPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalItems = PATCH_NOTES.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = PATCH_NOTES.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-8 max-w-4xl mx-auto w-full text-slate-100">
      {/* 1. Header Title */}
      <div className="w-full mb-6 pb-4 border-b border-void-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-400/30 text-purple-300">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="font-serif font-black text-2xl sm:text-3xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-200 to-sky-200">
              패치 내역 (PATCH NOTES)
            </h1>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              NMIXX TCG의 모든 업데이트 및 개선 이력을 최신순으로 확인하세요.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-400 bg-void-950 px-3 py-1.5 rounded-xl border border-white/10">
          <span>전체 업데이트: <strong className="text-pink-400 font-bold">{totalItems}개</strong></span>
          <span>•</span>
          <span>페이지: <strong className="text-purple-300 font-bold">{currentPage} / {totalPages}</strong></span>
        </div>
      </div>

      {/* 2. Lightweight Static Patch List */}
      <div className="w-full flex flex-col gap-4">
        {currentItems.map((note: PatchNote) => (
          <article
            key={note.version}
            className={`w-full p-4 sm:p-5 rounded-2xl border transition-all ${
              note.isLatest
                ? 'bg-gradient-to-br from-purple-950/40 via-void-900/90 to-void-950 border-purple-500/50 shadow-lg shadow-purple-950/30'
                : 'bg-void-900/70 border-void-800/80 hover:border-void-700'
            }`}
          >
            {/* Version & Date Header */}
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono font-black text-xs sm:text-sm px-2.5 py-0.5 rounded-lg border ${
                    note.isLatest
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border-pink-400/50 shadow-sm'
                      : 'bg-void-950 text-slate-300 border-white/10'
                  }`}
                >
                  {note.version}
                </span>

                {note.isLatest && (
                  <span className="flex items-center gap-1 text-[11px] font-mono font-black text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded-md animate-pulse">
                    <Sparkles size={12} className="text-yellow-300" />
                    LATEST (최신)
                  </span>
                )}
              </div>

              <time className="flex items-center gap-1.5 text-xs font-mono text-slate-300 bg-void-950/80 px-2.5 py-1 rounded-lg border border-white/10">
                <Clock size={12} className="text-purple-400" />
                <span>{note.date}</span>
              </time>
            </div>

            {/* Title */}
            <h2 className="font-serif font-bold text-base sm:text-lg text-slate-100 mb-2">
              {note.title}
            </h2>

            {/* Changes Bullet List */}
            <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-slate-300 leading-relaxed pl-1">
              {note.changes.map((change, idx) => (
                <li key={idx} className="marker:text-pink-400">
                  <span className="text-slate-200">{change}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      {/* 3. 20-Unit Pagination Navigation */}
      {totalPages > 1 && (
        <nav
          aria-label="패치 내역 페이지 이동"
          className="w-full flex items-center justify-center gap-2 mt-8 pt-4 border-t border-void-800/80 font-mono text-xs"
        >
          {/* 이전 페이지 버튼 */}
          <button
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1 transition-all cursor-pointer ${
              currentPage === 1
                ? 'bg-void-950 text-slate-600 border-white/5 cursor-not-allowed'
                : 'bg-void-900 hover:bg-void-800 text-slate-200 border-white/15 hover:border-pink-500/40'
            }`}
          >
            <ChevronLeft size={14} />
            <span>이전</span>
          </button>

          {/* 페이지 번호 목록 */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`w-8 h-8 rounded-xl font-bold transition-all flex items-center justify-center cursor-pointer ${
                  currentPage === pageNum
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border border-pink-400/50 shadow-md scale-105'
                    : 'bg-void-950/80 text-slate-400 hover:text-slate-100 hover:bg-void-900 border border-white/5'
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>

          {/* 다음 페이지 버튼 */}
          <button
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1 transition-all cursor-pointer ${
              currentPage === totalPages
                ? 'bg-void-950 text-slate-600 border-white/5 cursor-not-allowed'
                : 'bg-void-900 hover:bg-void-800 text-slate-200 border-white/15 hover:border-pink-500/40'
            }`}
          >
            <span>다음</span>
            <ChevronRight size={14} />
          </button>
        </nav>
      )}
    </div>
  );
};
