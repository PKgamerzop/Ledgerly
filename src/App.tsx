/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { NavigationTab, SpendingTransaction, Person } from './types';
import { subscribeTransactions, subscribePeople } from './db/storage';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { InstallPwaBanner } from './components/InstallPwaBanner';
import { AuthModal } from './components/AuthModal';
import { AddSpendingView } from './components/AddSpendingView';
import { SpendingHistoryView } from './components/SpendingHistoryView';
import { PeopleDebtsView } from './components/PeopleDebtsView';
import { MonthlyReportModal } from './components/MonthlyReportModal';

function MainApp() {
  const { user, loading } = useAuth();

  // Default view must be the "Add Transaction" interface upon login
  const [currentTab, setCurrentTab] = useState<NavigationTab>('add');
  const [showReportsModal, setShowReportsModal] = useState<boolean>(false);

  // Firestore real-time data states
  const [transactions, setTransactions] = useState<SpendingTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState<boolean>(true);

  const [people, setPeople] = useState<Person[]>([]);
  const [loadingPeople, setLoadingPeople] = useState<boolean>(true);

  // Parse URL query params (e.g. from PWA shortcut or links)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const actionParam = params.get('action');

    if (tabParam === 'people') setCurrentTab('people');
    else if (tabParam === 'history') setCurrentTab('history');
    else if (actionParam === 'add') setCurrentTab('add');
  }, []);

  // Subscribe to user's real-time data
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setPeople([]);
      setLoadingTransactions(false);
      setLoadingPeople(false);
      return;
    }

    setLoadingTransactions(true);
    setLoadingPeople(true);

    const unsubTransactions = subscribeTransactions(
      user.uid,
      (data) => {
        setTransactions(data);
        setLoadingTransactions(false);
      },
      (err) => {
        console.error('Error loading transactions:', err);
        setLoadingTransactions(false);
      }
    );

    const unsubPeople = subscribePeople(
      user.uid,
      (data) => {
        setPeople(data);
        setLoadingPeople(false);
      },
      (err) => {
        console.error('Error loading people:', err);
        setLoadingPeople(false);
      }
    );

    return () => {
      unsubTransactions();
      unsubPeople();
    };
  }, [user]);

  // Loading Screen (The Vintage Bookkeeper Style)
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f3eb] flex flex-col items-center justify-center p-4 text-[#2c1a0e] ledger-grid">
        <div className="w-16 h-16 mb-4 relative">
          <img src="/logo.svg" alt="Ledgerly" className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(44,24,16,0.15)]" />
        </div>
        <div className="bg-[#fcf9f2] border border-[#d8c7b0] rounded-2xl p-7 text-center max-w-sm w-full shadow-[0_8px_24px_-4px_rgba(44,24,16,0.12)] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6b4028] via-[#c59b27] to-[#2c1810]"></div>
          <div className="font-serif text-lg font-bold tracking-normal text-[#2c1810] mb-1">
            Ledgerly Accounting
          </div>
          <p className="text-xs text-[#7d6350] mb-4 italic">Opening bound accounting ledger...</p>
          <div className="w-full bg-[#ede4d4] border border-[#d8c7b0] rounded-full h-2 overflow-hidden">
            <div className="h-full bg-[#6b4028] animate-pulse w-3/4 rounded-full"></div>
          </div>
          <div className="mt-4 flex justify-between text-[11px] text-[#8c7361] font-serif">
            <span>Vol. MCMXXVI</span>
            <span>Folio &amp; Register</span>
            <span>Archival Safe</span>
          </div>
        </div>
      </div>
    );
  }

  // If not logged in, show clean Auth page
  if (!user) {
    return <AuthModal />;
  }

  return (
    <div className="min-h-screen bg-[#f7f3eb] text-[#2c1a0e] flex flex-col antialiased selection:bg-[#d4b996]/40 selection:text-[#2c1a0e]">
      {/* PWA Install Banner */}
      <InstallPwaBanner />

      {/* Main Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        onOpenReports={() => setShowReportsModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-28 md:pb-14 ledger-grid">
        {currentTab === 'add' && (
          <AddSpendingView
            recentTransactions={transactions}
            onViewHistory={() => setCurrentTab('history')}
          />
        )}

        {currentTab === 'history' && (
          <SpendingHistoryView
            transactions={transactions}
            loading={loadingTransactions}
            onAddNew={() => setCurrentTab('add')}
          />
        )}

        {currentTab === 'people' && (
          <PeopleDebtsView
            people={people}
            loading={loadingPeople}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        onOpenReports={() => setShowReportsModal(true)}
      />

      {/* Monthly Report Modal */}
      {showReportsModal && (
        <MonthlyReportModal
          transactions={transactions}
          onClose={() => setShowReportsModal(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <MainApp />
      </CurrencyProvider>
    </AuthProvider>
  );
}
