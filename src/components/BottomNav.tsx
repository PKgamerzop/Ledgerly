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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 shadow-lg safe-area-pb">
      <div className="grid grid-cols-4 items-center max-w-md mx-auto">
        <button
          id="mobile-tab-add"
          onClick={() => onTabChange('add')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
            currentTab === 'add'
              ? 'text-teal-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1 rounded-full ${currentTab === 'add' ? 'bg-teal-50 text-teal-700' : ''}`}>
            <PlusCircle className="w-5 h-5" />
          </div>
          <span className="text-[11px] mt-0.5">Add Spend</span>
        </button>

        <button
          id="mobile-tab-history"
          onClick={() => onTabChange('history')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
            currentTab === 'history'
              ? 'text-teal-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1 rounded-full ${currentTab === 'history' ? 'bg-teal-50 text-teal-700' : ''}`}>
            <History className="w-5 h-5" />
          </div>
          <span className="text-[11px] mt-0.5">History</span>
        </button>

        <button
          id="mobile-tab-people"
          onClick={() => onTabChange('people')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
            currentTab === 'people'
              ? 'text-teal-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1 rounded-full ${currentTab === 'people' ? 'bg-teal-50 text-teal-700' : ''}`}>
            <Users className="w-5 h-5" />
          </div>
          <span className="text-[11px] mt-0.5">Debts</span>
        </button>

        <button
          id="mobile-tab-report"
          onClick={onOpenReports}
          className="flex flex-col items-center justify-center py-1 rounded-xl text-slate-500 hover:text-slate-800 transition"
        >
          <div className="p-1 rounded-full">
            <FileSpreadsheet className="w-5 h-5 text-teal-600" />
          </div>
          <span className="text-[11px] mt-0.5">Reports</span>
        </button>
      </div>
    </nav>
  );
};
