import React from 'react';
import { Package, Layers, Award, Trophy, Info, FileText } from 'lucide-react';
import { NavTab } from '../../types/game';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  // 🌟 카테고리 순서: 팩오픈 -> 컬렉션 -> 업적 -> 랭킹 -> 인포메이션 -> 패치노트
  const tabs = [
    { id: 'home', label: 'PACK', icon: Package },
    { id: 'collection', label: 'CARDS', icon: Layers },
    { id: 'achievements', label: 'ACHIEVE', icon: Award },
    { id: 'ranking', label: 'RANK', icon: Trophy },
    { id: 'settings', label: 'INFO', icon: Info },
    { id: 'patch-notes', label: 'PATCH', icon: FileText },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-void-950/95 backdrop-blur-xl border-t border-void-800 flex items-center justify-around px-1 select-none">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id as NavTab)}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all cursor-pointer ${
              isActive
                ? 'text-pink-400 bg-pink-500/15 font-bold scale-105'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon size={17} className={tab.id === 'ranking' && isActive ? 'text-amber-400' : ''} />
            <span className="text-[9.5px] font-mono tracking-tighter mt-0.5">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
