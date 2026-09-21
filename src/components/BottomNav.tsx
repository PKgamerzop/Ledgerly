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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#2c1810] border-t border-[#44281b] px-2 py-2 shadow-[0_-4px_16px_rgba(44,24,16,0.3)] safe-area-pb">
      <div className="flex items-center justify-around max-w-md mx-auto gap-1">
        <button
          id="mobile-tab-add"
          onClick={() => onTabChange('add')}
          className={`flex-1 py-1.5 px-1.5 flex flex-col items-center justify-center rounded-xl transition cursor-pointer font-serif ${
            currentTab === 'add'
              ? 'bg-[#fcf9f2] text-[#2c1810] shadow-[0_2px_6px_rgba(0,0,0,0.3)] font-bold'
              : 'text-[#d6c2a8] hover:text-[#ffffff]'
          }`}
        >
          <PlusCircle className={`w-4 h-4 ${currentTab === 'add' ? 'text-[#85261c]' : 'text-[#c59b27]'}`} />
          <span className="text-[10px] mt-1 font-semibold tracking-wide">
            Record
          </span>
        </button>

        <button
          id="mobile-tab-history"
          onClick={() => onTabChange('history')}
          className={`flex-1 py-1.5 px-1.5 flex flex-col items-center justify-center rounded-xl transition cursor-pointer font-serif ${
            currentTab === 'history'
              ? 'bg-[#fcf9f2] text-[#2c1810] shadow-[0_2px_6px_rgba(0,0,0,0.3)] font-bold'
              : 'text-[#d6c2a8] hover:text-[#ffffff]'
          }`}
        >
          <History className={`w-4 h-4 ${currentTab === 'history' ? 'text-[#2c1810]' : 'text-[#c59b27]'}`} />
          <span className="text-[10px] mt-1 font-semibold tracking-wide">
            Ledger
          </span>
        </button>

        <button
          id="mobile-tab-people"
          onClick={() => onTabChange('people')}
          className={`flex-1 py-1.5 px-1.5 flex flex-col items-center justify-center rounded-xl transition cursor-pointer font-serif ${
            currentTab === 'people'
              ? 'bg-[#fcf9f2] text-[#2c1810] shadow-[0_2px_6px_rgba(0,0,0,0.3)] font-bold'
              : 'text-[#d6c2a8] hover:text-[#ffffff]'
          }`}
        >
          <Users className={`w-4 h-4 ${currentTab === 'people' ? 'text-[#2c1810]' : 'text-[#c59b27]'}`} />
          <span className="text-[10px] mt-1 font-semibold tracking-wide">
            Accounts
          </span>
        </button>

        <button
          id="mobile-tab-report"
          onClick={onOpenReports}
          className="flex-1 py-1.5 px-1.5 flex flex-col items-center justify-center rounded-xl transition cursor-pointer font-serif text-[#d9bf8f] hover:text-[#ffffff]"
        >
          <FileSpreadsheet className="w-4 h-4 text-[#48bb78]" />
          <span className="text-[10px] mt-1 font-semibold tracking-wide text-[#e0c48e]">
            Statement
          </span>
        </button>
      </div>
    </nav>
  );
};
