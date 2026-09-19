import React from 'react';
import { NavigationTab } from '../types';
import { PlusCircle, History, Users, FileSpreadsheet } from 'lucide-react';

interface BottomNavProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenReports: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  onOpenReports,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#14110e]/95 border-t-4 border-[#080604] px-3 py-2 shadow-2xl safe-area-pb">
      <div className="mc-hotbar flex items-center justify-around max-w-sm mx-auto p-1.5 gap-1.5">
        <button
          id="mobile-tab-add"
          onClick={() => onTabChange('add')}
          className={`mc-hotbar-slot flex-1 py-1.5 flex flex-col items-center justify-center cursor-pointer ${
            currentTab === 'add' ? 'active' : ''
          }`}
        >
          <PlusCircle className={`w-5 h-5 ${currentTab === 'add' ? 'text-[#55ff55]' : 'text-[#a0a0a0]'}`} />
          <span className={`font-mc text-[10px] mt-0.5 ${currentTab === 'add' ? 'text-[#55ff55] font-bold' : 'text-[#888888]'}`}>
            Add
          </span>
        </button>

        <button
          id="mobile-tab-history"
          onClick={() => onTabChange('history')}
          className={`mc-hotbar-slot flex-1 py-1.5 flex flex-col items-center justify-center cursor-pointer ${
            currentTab === 'history' ? 'active' : ''
          }`}
        >
          <History className={`w-5 h-5 ${currentTab === 'history' ? 'text-[#55ff55]' : 'text-[#a0a0a0]'}`} />
          <span className={`font-mc text-[10px] mt-0.5 ${currentTab === 'history' ? 'text-[#55ff55] font-bold' : 'text-[#888888]'}`}>
            History
          </span>
        </button>

        <button
          id="mobile-tab-people"
          onClick={() => onTabChange('people')}
          className={`mc-hotbar-slot flex-1 py-1.5 flex flex-col items-center justify-center cursor-pointer ${
            currentTab === 'people' ? 'active' : ''
          }`}
        >
          <Users className={`w-5 h-5 ${currentTab === 'people' ? 'text-[#55ff55]' : 'text-[#a0a0a0]'}`} />
          <span className={`font-mc text-[10px] mt-0.5 ${currentTab === 'people' ? 'text-[#55ff55] font-bold' : 'text-[#888888]'}`}>
            Debts
          </span>
        </button>

        <button
          id="mobile-tab-report"
          onClick={onOpenReports}
          className="mc-hotbar-slot flex-1 py-1.5 flex flex-col items-center justify-center cursor-pointer"
        >
          <FileSpreadsheet className="w-5 h-5 text-[#4de1f4]" />
          <span className="font-mc text-[10px] mt-0.5 text-[#4de1f4]">
            Report
          </span>
        </button>
      </div>
    </nav>
  );
};
