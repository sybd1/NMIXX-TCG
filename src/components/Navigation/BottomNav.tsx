import React from 'react';
import { Package, Layers, Trophy, Info } from 'lucide-react';
import { NavTab } from '../../types/game';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { id: 'home', label: 'PACK', icon: Package },
    { id: 'collection', label: 'CARDS', icon: Layers },
    { id: 'achievements', label: 'ACHIEVE', icon: Trophy },
    { id: 'settings', label: 'INFO', icon: Info },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-void-950/95 backdrop-blur-xl border-t border-void-800 flex items-center justify-around px-2">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id as NavTab)}
            className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all ${
              isActive
                ? 'text-purple-400 bg-purple-500/15 font-bold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon size={18} />
            <span className="text-[10px] font-mono tracking-tighter mt-0.5">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
