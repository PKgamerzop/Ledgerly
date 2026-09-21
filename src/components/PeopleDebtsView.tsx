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
  CheckCircle2,
  X,
  Phone,
  AlertCircle,
  BookOpen,
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

  // Auto-clean settled people
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
          return p.balance > 0.009;
        } else {
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
      setErrorMessage('Counterparty name is required.');
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
      setErrorMessage('Failed to open account. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  // Sync selected person if people list updates in real-time
  const currentSelectedPerson = useMemo(() => {
    if (!selectedPerson) return null;
    return people.find((p) => p.id === selectedPerson.id) || null;
  }, [selectedPerson, people]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-10">
      {/* Header (The Vintage Bookkeeper Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#f4ede1] border border-[#d8c7b0] text-[#6b4028] px-3.5 py-1 rounded-full text-xs font-serif mb-2 shadow-xs">
            <BookOpen className="w-3.5 h-3.5 text-[#85261c]" />
            <span>Counterparty Accounts Ledger</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#24140a] tracking-tight">
            Accounts &amp; Bilateral Ledgers
          </h2>
          <p className="text-xs text-[#6e5340] mt-1 font-serif italic">
            Track receivables (money to collect) and payables (money owed) with individual balance registers.
          </p>
        </div>

        <button
          id="btn-add-person"
          onClick={() => setShowAddModal(true)}
          className="btn-leather font-serif px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4 text-[#fbf5eb]" />
          <span>+ Add Counterparty</span>
        </button>
      </div>

      {/* Receivables vs Payables Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* To Take Block (Archival Green Ink / Receivables) */}
        <div
          onClick={() => setActiveTab('to_take')}
          className={`cursor-pointer vintage-card p-5 transition relative overflow-hidden border-2 ${
            activeTab === 'to_take'
              ? 'border-[#265c3b] bg-[#eff7f1]'
              : 'border-[#d8c7b0] hover:border-[#bfaaa0]'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-serif font-bold flex items-center gap-1.5 text-[#265c3b]">
              <ArrowDownLeft className="w-4 h-4" />
              <span>Receivables (To Collect)</span>
            </span>
            <span className="font-serif text-[11px] text-[#265c3b] bg-[#ffffff] px-2 py-0.5 rounded border border-[#b9deb4]">
              {toTakeCount} {toTakeCount === 1 ? 'account' : 'accounts'}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold tabular-nums text-[#265c3b]">
            {formatCurrency(totalOwedToMe, currency)}
          </div>
          <p className="text-[11px] text-[#6e5340] mt-1 font-serif italic">
            Funds lent or paid on behalf of others to be returned to you.
          </p>
        </div>

        {/* To Give Block (Classic Red Ink / Payables) */}
        <div
          onClick={() => setActiveTab('to_give')}
          className={`cursor-pointer vintage-card p-5 transition relative overflow-hidden border-2 ${
            activeTab === 'to_give'
              ? 'border-[#a63428] bg-[#fbf0ee]'
              : 'border-[#d8c7b0] hover:border-[#bfaaa0]'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-serif font-bold flex items-center gap-1.5 text-[#a63428]">
              <ArrowUpRight className="w-4 h-4" />
              <span>Payables (To Settle)</span>
            </span>
            <span className="font-serif text-[11px] text-[#a63428] bg-[#ffffff] px-2 py-0.5 rounded border border-[#e8b6b0]">
              {toGiveCount} {toGiveCount === 1 ? 'account' : 'accounts'}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold tabular-nums text-[#a63428]">
            {formatCurrency(totalIOwe, currency)}
          </div>
          <p className="text-[11px] text-[#6e5340] mt-1 font-serif italic">
            Obligations, borrowings, or expenses owed that must be paid back.
          </p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="vintage-card p-3.5 mb-6 flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Tab switcher pills */}
        <div className="flex items-center w-full sm:w-auto bg-[#f4ede1] p-1 rounded-xl border border-[#dfd1bd]">
          <button
            id="tab-btn-to-take"
            type="button"
            onClick={() => setActiveTab('to_take')}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-serif font-bold transition cursor-pointer ${
              activeTab === 'to_take'
                ? 'bg-[#ffffff] text-[#265c3b] border border-[#b9deb4] shadow-xs'
                : 'text-[#6e5340] hover:text-[#24140a]'
            }`}
          >
            Receivables ({toTakeCount})
          </button>
          <button
            id="tab-btn-to-give"
            type="button"
            onClick={() => setActiveTab('to_give')}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-serif font-bold transition cursor-pointer ${
              activeTab === 'to_give'
                ? 'bg-[#ffffff] text-[#a63428] border border-[#e8b6b0] shadow-xs'
                : 'text-[#6e5340] hover:text-[#24140a]'
            }`}
          >
            Payables ({toGiveCount})
          </button>
        </div>

        {/* Search */}
        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-[#8c7361] absolute left-3.5 top-2.5" />
          <input
            id="people-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, notes..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#ffffff] border border-[#cfbeaa] rounded-xl text-[#24140a] placeholder:text-[#a89584] focus:border-[#6b4028] focus:ring-1 focus:ring-[#6b4028]/20 outline-none transition shadow-2xs"
          />
        </div>
      </div>

      {/* People Grid Cards */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[#7d6350] font-serif">
          <div className="w-8 h-8 border-2 border-[#6b4028]/30 border-t-[#6b4028] rounded-full animate-spin mx-auto mb-3" />
          <span className="italic">Reviewing counterparty registers...</span>
        </div>
      ) : filteredPeople.length === 0 ? (
        <div className="vintage-card p-12 text-center">
          <Inbox className="w-10 h-10 text-[#a89584] mx-auto mb-3" />
          <h3 className="font-serif text-base font-bold text-[#24140a]">
            {searchQuery
              ? 'No Counterparty Matches Search'
              : activeTab === 'to_take'
              ? 'No Outstanding Receivables'
              : 'No Outstanding Payables'}
          </h3>
          <p className="text-xs text-[#6e5340] mt-1 max-w-sm mx-auto font-serif italic">
            {searchQuery
              ? 'Try changing your search keywords.'
              : activeTab === 'to_take'
              ? 'No one currently owes you money. Click "+ Add Counterparty" to log a balance.'
              : 'You have no outstanding payables. All accounts are in good standing.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 btn-leather font-serif px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              + Add First Counterparty
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPeople.map((person) => {
            const isOwedToMe = person.balance > 0;
            const absBalance = Math.abs(person.balance);

            return (
              <div
                key={person.id}
                onClick={() => setSelectedPerson(person)}
                className="vintage-card p-5 cursor-pointer transition-all hover:shadow-[0_6px_22px_-2px_rgba(44,24,16,0.12)] group relative border hover:border-[#6b4028]"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#f4ede1] border border-[#d8c7b0] flex items-center justify-center font-serif font-bold text-base text-[#4a2c1d] group-hover:border-[#6b4028] transition shadow-2xs">
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-serif text-base font-bold text-[#24140a] truncate group-hover:text-[#6b4028] transition">
                        {person.name}
                      </h4>
                      {person.phone && (
                        <div className="flex items-center gap-1 text-[#7d6350] text-xs mt-0.5">
                          <Phone className="w-3 h-3 text-[#a89584]" />
                          <span>{person.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Balance Display */}
                  <div className="text-right shrink-0 font-serif">
                    <div
                      className={`text-xl font-bold tabular-nums ${
                        isOwedToMe ? 'text-[#265c3b]' : 'text-[#a63428]'
                      }`}
                    >
                      {formatCurrency(absBalance, currency)}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded border inline-block mt-0.5 ${
                        isOwedToMe
                          ? 'bg-[#eff7f1] text-[#265c3b] border-[#b9deb4]'
                          : 'bg-[#fbf0ee] text-[#a63428] border-[#e8b6b0]'
                      }`}
                    >
                      {isOwedToMe ? 'Owed to You' : 'You Owe'}
                    </span>
                  </div>
                </div>

                {person.notes && (
                  <p className="text-xs text-[#6e5340] bg-[#f7f3eb] p-2 rounded-xl border border-[#e4d7c5] line-clamp-2 mb-3 font-serif italic">
                    &ldquo;{person.notes}&rdquo;
                  </p>
                )}

                <div className="pt-2.5 border-t border-[#dfd1bd] flex items-center justify-between text-xs text-[#7d6350]">
                  <span className="text-[11px] font-serif italic">Inspect Bilateral Register</span>
                  <span className="text-[#6b4028] text-[11px] font-serif font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    <span>View Folio &rarr;</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Person Modal (The Vintage Bookkeeper Theme) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1f100a]/65 backdrop-blur-xs">
          <div className="vintage-card max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#85261c] via-[#c59b27] to-[#265c3b]"></div>

            <div className="flex items-center justify-between pb-3 border-b border-[#dfd1bd] mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#85261c]" />
                <h3 className="font-serif text-base font-bold text-[#24140a]">
                  Open Counterparty Account
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-[#7d6350] hover:text-[#24140a] hover:bg-[#f4ede1] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-[#fbf0ee] border border-[#e8b6b0] text-[#a63428] text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreatePerson} className="space-y-4">
              <div>
                <label className="block text-xs font-serif font-bold text-[#594132] uppercase tracking-wider mb-1">
                  Counterparty Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Arthur Pendelton, Baker &amp; Sons, Landlord"
                  className="w-full px-3 py-2 text-xs text-[#24140a] bg-[#ffffff] border border-[#cfbeaa] rounded-xl focus:border-[#6b4028] outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-serif font-bold text-[#594132] uppercase tracking-wider mb-1">
                  Telephone (Optional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 012-3456"
                  className="w-full px-3 py-2 text-xs text-[#24140a] bg-[#ffffff] border border-[#cfbeaa] rounded-xl focus:border-[#6b4028] outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-serif font-bold text-[#594132] uppercase tracking-wider mb-1">
                  Opening Balance ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(e.target.value)}
                  placeholder="0.00 (leave blank if starting at zero)"
                  className="w-full px-3 py-2 text-sm tabular-nums font-serif font-bold text-[#24140a] bg-[#ffffff] border border-[#cfbeaa] rounded-xl focus:border-[#6b4028] outline-none shadow-2xs"
                />
              </div>

              {parseFloat(initialAmount) > 0 && (
                <div className="p-3 bg-[#f4ede1] border border-[#dfd1bd] rounded-xl space-y-3">
                  <label className="block text-[11px] font-serif font-bold text-[#594132] uppercase tracking-wider">
                    Balance Direction:
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs font-serif">
                    <button
                      type="button"
                      onClick={() => setInitialType('give')}
                      className={`py-2 px-2 rounded-lg font-bold border transition ${
                        initialType === 'give'
                          ? 'bg-[#eff7f1] text-[#265c3b] border-[#b9deb4] shadow-xs'
                          : 'bg-[#ffffff] text-[#6e5340] border-[#d8c7b0]'
                      }`}
                    >
                      They Owe Me (To Collect)
                    </button>
                    <button
                      type="button"
                      onClick={() => setInitialType('take')}
                      className={`py-2 px-2 rounded-lg font-bold border transition ${
                        initialType === 'take'
                          ? 'bg-[#fbf0ee] text-[#a63428] border-[#e8b6b0] shadow-xs'
                          : 'bg-[#ffffff] text-[#6e5340] border-[#d8c7b0]'
                      }`}
                    >
                      I Owe Them (To Pay)
                    </button>
                  </div>
                  <div>
                    <label className="block text-[11px] font-serif font-bold text-[#594132] uppercase tracking-wider mb-1">
                      Reason for Opening Balance:
                    </label>
                    <input
                      type="text"
                      value={initialReason}
                      onChange={(e) => setInitialReason(e.target.value)}
                      placeholder="e.g. Dinner bill split, Advance for groceries"
                      className="w-full px-3 py-1.5 text-xs text-[#24140a] bg-[#ffffff] border border-[#cfbeaa] rounded-lg focus:border-[#6b4028] outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-serif font-bold text-[#594132] uppercase tracking-wider mb-1">
                  Account Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional terms, address, or details..."
                  className="w-full px-3 py-2 text-xs text-[#24140a] bg-[#ffffff] border border-[#cfbeaa] rounded-xl focus:border-[#6b4028] outline-none shadow-2xs font-serif"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#cfbeaa] text-xs font-serif font-bold text-[#6e5340] hover:text-[#24140a] hover:bg-[#f4ede1] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl btn-leather text-xs font-serif font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Record Account</span>
                  )}
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
