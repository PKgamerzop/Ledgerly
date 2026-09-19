import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { addPerson, cleanUpSettledPeople } from '../db/storage';
import { Person, DebtType } from '../types';
import { formatCurrency, getTodayDateString } from '../utils/formatters';
import { PersonLedgerModal } from './PersonLedgerModal';
import {
  Users,
  UserPlus,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Inbox,
  Sparkles,
  CheckCircle2,
  X,
  Phone,
  AlertCircle,
} from 'lucide-react';

interface PeopleDebtsViewProps {
  people: Person[];
  loading: boolean;
}

export const PeopleDebtsView: React.FC<PeopleDebtsViewProps> = ({ people, loading }) => {
  const { user } = useAuth();
  const { currency } = useCurrency();

  const [activeTab, setActiveTab] = useState<DebtType>('to_take'); // 'to_take' = Owed to me; 'to_give' = I owe
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  // New Person Form State
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [initialAmount, setInitialAmount] = useState<string>('');
  const [initialType, setInitialType] = useState<'give' | 'take'>('give'); // 'give' = I lent them; 'take' = I borrowed
  const [initialReason, setInitialReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-clean any settled people (balance 0 / nothing to give or take)
  useEffect(() => {
    if (!user) return;
    const settled = people.filter((p) => Math.abs(p.balance || 0) < 0.01);
    if (settled.length > 0) {
      cleanUpSettledPeople(user.uid).catch((err) => {
        console.warn('Auto cleanup of settled people failed:', err);
      });
    }
  }, [people, user]);

  // Totals calculations
  const totalOwedToMe = useMemo(() => {
    return people
      .filter((p) => p.balance > 0.009)
      .reduce((sum, p) => sum + p.balance, 0);
  }, [people]);

  const totalIOwe = useMemo(() => {
    return people
      .filter((p) => p.balance < -0.009)
      .reduce((sum, p) => sum + Math.abs(p.balance), 0);
  }, [people]);

  const toTakeCount = useMemo(() => people.filter((p) => p.balance > 0.009).length, [people]);
  const toGiveCount = useMemo(() => people.filter((p) => p.balance < -0.009).length, [people]);

  // Filter people based on active tab & search
  // Rule: Exclude settled people (balance 0 - 0 money to give or take)
  const filteredPeople = useMemo(() => {
    return people
      .filter((p) => {
        const isSettled = Math.abs(p.balance || 0) < 0.01;
        if (isSettled) return false;

        const matchesSearch =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.phone && p.phone.includes(searchQuery)) ||
          (p.notes && p.notes.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch) return false;

        if (activeTab === 'to_take') {
          // Money owed to me: strictly positive
          return p.balance > 0.009;
        } else {
          // Money I owe: strictly negative
          return p.balance < -0.009;
        }
      })
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  }, [people, activeTab, searchQuery]);

  const handleCreatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Person name is required.');
      return;
    }

    const parsedInit = parseFloat(initialAmount);
    if (initialAmount && (isNaN(parsedInit) || parsedInit < 0)) {
      setErrorMessage('Initial balance cannot be negative.');
      return;
    }

    try {
      setSubmitting(true);
      await addPerson(user.uid, {
        name: name.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
        initialAmount: parsedInit > 0 ? parsedInit : undefined,
        initialType,
        initialReason: initialReason.trim() || undefined,
        initialDate: getTodayDateString(),
      });

      // Reset form
      setName('');
      setPhone('');
      setNotes('');
      setInitialAmount('');
      setInitialReason('');
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to add person:', err);
      setErrorMessage('Failed to add person. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  // Sync selected person if people list updates in real-time
  const currentSelectedPerson = useMemo(() => {
    if (!selectedPerson) return null;
    return people.find((p) => p.id === selectedPerson.id) || null;
  }, [people, selectedPerson]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="mc-badge bg-[#1b3d1b] border-2 border-black text-[#55ff55] px-3 py-1 text-xs mb-1">
            <Users className="w-3.5 h-3.5 mr-1 text-[#55ff55]" />
            <span>Debts & Villager Ledgers</span>
          </div>
          <h2 className="font-pixel text-2xl sm:text-3xl text-[#ffffff] tracking-wide drop-shadow-[2px_2px_0_#000]">
            People & Debts
          </h2>
          <p className="font-mc text-xs sm:text-sm text-[#a0a0a0] mt-0.5">
            Track money you lent ("To Take") and money you borrowed ("To Give").
          </p>
        </div>

        <button
          id="btn-add-new-person"
          onClick={() => setShowAddModal(true)}
          className="mc-button mc-button-emerald flex items-center gap-2 px-4 py-2.5 text-xs font-bold cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Person</span>
        </button>
      </div>

      {/* Debt Summary Cards (Minecraft Emerald / Gold Chests) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div
          onClick={() => setActiveTab('to_take')}
          className={`cursor-pointer mc-panel p-5 transition ${
            activeTab === 'to_take'
              ? 'ring-4 ring-[#55ff55] bg-[#222a22]'
              : 'hover:bg-[#2b2520]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-pixel text-xs text-[#55ff55] uppercase tracking-wider flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4" />
              To Take (Owed to Me)
            </span>
            <span className="mc-badge bg-[#183a18] text-[#55ff55] px-2 py-0.5 text-[10px]">
              Emeralds
            </span>
          </div>
          <div className="font-pixel text-2xl sm:text-3xl text-[#55ff55]">
            {formatCurrency(totalOwedToMe, currency)}
          </div>
          <div className="font-mc text-[11px] text-[#888888] mt-1">
            Total amount friends and colleagues owe you
          </div>
        </div>

        <div
          onClick={() => setActiveTab('to_give')}
          className={`cursor-pointer mc-panel p-5 transition ${
            activeTab === 'to_give'
              ? 'ring-4 ring-[#ffaa00] bg-[#2d251d]'
              : 'hover:bg-[#2b2520]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-pixel text-xs text-[#ffaa00] uppercase tracking-wider flex items-center gap-1">
              <ArrowDownLeft className="w-4 h-4" />
              To Give (Money I Owe)
            </span>
            <span className="mc-badge bg-[#3d2714] text-[#ffaa00] px-2 py-0.5 text-[10px]">
              Gold / Debt
            </span>
          </div>
          <div className="font-pixel text-2xl sm:text-3xl text-[#ffaa00]">
            {formatCurrency(totalIOwe, currency)}
          </div>
          <div className="font-mc text-[11px] text-[#888888] mt-1">
            Total amount you need to pay back
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="mc-panel p-3 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Requirement: Distinct section divided into two tabs/views: "To Give" and "To Take" */}
        <div className="flex w-full sm:w-auto gap-2">
          <button
            id="tab-to-take"
            onClick={() => setActiveTab('to_take')}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'to_take'
                ? 'mc-button mc-button-emerald'
                : 'mc-button'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>To Take ({toTakeCount})</span>
          </button>

          <button
            id="tab-to-give"
            onClick={() => setActiveTab('to_give')}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'to_give'
                ? 'mc-button mc-button-redstone'
                : 'mc-button'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>To Give ({toGiveCount})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#888888] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search person by name..."
            className="mc-input w-full pl-9 pr-3 py-1.5 text-xs text-[#ffffff] placeholder:text-[#666666]"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="mc-panel p-5 animate-pulse h-28" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredPeople.length === 0 && (
        <div className="mc-panel p-10 text-center">
          <div className="w-14 h-14 bg-[#161310] border-2 border-black text-[#55ff55] flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-7 h-7" />
          </div>
          <h3 className="font-pixel text-base text-[#ffffff]">
            {activeTab === 'to_take' ? 'No One Owes You Money' : 'You Don’t Owe Anyone Money'}
          </h3>
          <p className="font-mc text-xs text-[#888888] max-w-sm mx-auto mt-1 mb-5">
            {activeTab === 'to_take'
              ? 'When you lend money or split a bill, add them here to track repayments.'
              : 'Keep track of borrowed funds and loans so you never forget to settle up.'}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mc-button mc-button-emerald inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Person</span>
          </button>
        </div>
      )}

      {/* People Cards Grid */}
      {!loading && filteredPeople.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredPeople.map((person) => {
            const isOwedToMe = person.balance > 0;
            const isOwedByMe = person.balance < 0;
            const isSettled = person.balance === 0;

            return (
              <div
                key={person.id}
                onClick={() => setSelectedPerson(person)}
                className="mc-panel p-4 hover:brightness-110 transition cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Initials Avatar (Minecraft pixel block) */}
                    <div className="w-10 h-10 bg-[#1e3d23] border-2 border-black text-[#55ff55] font-pixel text-base flex items-center justify-center shadow-[inset_1px_1px_0_#4a9e52,inset_-1px_-1px_0_#0f2413]">
                      {person.name.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <h4 className="font-bold text-[#ffffff] text-sm group-hover:text-[#55ff55] transition">
                        {person.name}
                      </h4>
                      {person.phone && (
                        <p className="font-mc text-[11px] text-[#888888]">{person.phone}</p>
                      )}
                      {person.notes && (
                        <p className="font-mc text-[11px] text-[#888888] italic line-clamp-1">{person.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Balance Badge */}
                  <div className="text-right">
                    <div
                      className={`font-pixel text-base ${
                        isOwedToMe
                          ? 'text-[#55ff55]'
                          : isOwedByMe
                          ? 'text-[#ffaa00]'
                          : 'text-[#888888]'
                      }`}
                    >
                      {isOwedToMe && `+${formatCurrency(person.balance, currency)}`}
                      {isOwedByMe && `-${formatCurrency(Math.abs(person.balance), currency)}`}
                      {isSettled && formatCurrency(0, currency)}
                    </div>
                    <span className="font-mc text-[10px] uppercase font-bold tracking-wider text-[#888888]">
                      {isOwedToMe ? 'Owes you' : isOwedByMe ? 'You owe' : 'Settled'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t-2 border-[#16120e] flex items-center justify-between text-[11px] text-[#888888] font-mc">
                  <span>Click to view ledger & settle</span>
                  <span className="text-[#55ffff] font-bold group-hover:underline">Open Ledger →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Person Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="mc-panel max-w-md w-full overflow-hidden p-0">
            <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#15120e] bg-[#1e1914]">
              <h3 className="font-pixel text-[#ffffff] text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#55ff55]" />
                Add New Person
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="mc-button p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePerson} className="p-6 space-y-4">
              {errorMessage && (
                <div className="flex items-start gap-2 p-3 mc-panel bg-[#4a1414] border-2 border-[#1a0505] text-[#ff6b6b] text-xs">
                  <AlertCircle className="w-4 h-4 text-[#ff4444] shrink-0 mt-0.5" />
                  <span className="font-mc">{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block font-pixel text-xs text-[#ffd700] uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  className="mc-input w-full px-4 py-2 text-sm text-[#ffffff] placeholder:text-[#666666]"
                />
              </div>

              <div>
                <label className="block font-pixel text-xs text-[#ffd700] uppercase tracking-wider mb-1.5">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#888888] absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555-0199"
                    className="mc-input w-full pl-10 pr-4 py-2 text-sm text-[#ffffff] placeholder:text-[#666666]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-pixel text-xs text-[#ffd700] uppercase tracking-wider mb-1.5">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Colleague from work, Roommate"
                  className="mc-input w-full px-4 py-2 text-sm text-[#ffffff] placeholder:text-[#666666]"
                />
              </div>

              <div className="pt-2 border-t-2 border-[#15120e]">
                <label className="block font-pixel text-xs text-[#ffd700] uppercase tracking-wider mb-2">
                  Initial Balance (Optional)
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setInitialType('give')}
                    className={`py-2 px-2 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      initialType === 'give'
                        ? 'mc-button mc-button-emerald'
                        : 'mc-button'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>They Owe Me</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInitialType('take')}
                    className={`py-2 px-2 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      initialType === 'take'
                        ? 'mc-button mc-button-redstone'
                        : 'mc-button'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>I Owe Them</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(e.target.value)}
                    placeholder={`Amount (${currency})`}
                    className="mc-input w-full px-3 py-2 text-xs text-[#ffffff] placeholder:text-[#666666]"
                  />
                  <input
                    type="text"
                    value={initialReason}
                    onChange={(e) => setInitialReason(e.target.value)}
                    placeholder="Reason for debt"
                    className="mc-input w-full px-3 py-2 text-xs text-[#ffffff] placeholder:text-[#666666]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t-2 border-[#15120e]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="mc-button px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="mc-button mc-button-emerald px-5 py-2 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#55ff55]" />
                  <span>Save Person</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Person Detailed Ledger Modal */}
      {currentSelectedPerson && (
        <PersonLedgerModal
          person={currentSelectedPerson}
          onClose={() => setSelectedPerson(null)}
        />
      )}
    </div>
  );
};
