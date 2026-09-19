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

  // Loading Screen (Minecraft Style)
  if (loading) {
    return (
      <div className="min-h-screen bg-[#181410] flex flex-col items-center justify-center p-4 text-[#e0e0e0]">
        <div className="w-16 h-16 mb-4 animate-bounce">
          <img src="/logo.svg" alt="Ledgerly" className="w-full h-full object-contain filter drop-shadow-[0_4px_0_#000]" />
        </div>
        <div className="mc-panel-stone px-6 py-4 text-center max-w-xs w-full mb-3">
          <div className="font-pixel text-base text-[#ffd700] tracking-wider mb-2">LEDGERLY</div>
          <div className="w-full bg-[#14110e] border-2 border-black p-0.5">
            <div className="h-3 bg-[#55b855] animate-pulse w-3/4"></div>
          </div>
          <p className="font-pixel text-[11px] text-[#a0a0a0] mt-3 uppercase tracking-wider">Loading Terrain...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show clean Auth page
  if (!user) {
    return <AuthModal />;
  }

  return (
    <div className="min-h-screen bg-[#181410] text-[#e0e0e0] flex flex-col antialiased selection:bg-[#2e7d32] selection:text-white">
      {/* PWA Install Banner */}
      <InstallPwaBanner />

      {/* Main Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        onOpenReports={() => setShowReportsModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-28 md:pb-14">
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
