import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { addPerson, cleanUpSettledPeople } from '../firebase/db';
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-semibold mb-1">
            <Users className="w-3.5 h-3.5 text-teal-600" />
            Debts & Ledgers
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            People & Debts
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Track money you lent ("To Take") and money you borrowed ("To Give").
          </p>
        </div>

        <button
          id="btn-add-new-person"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0c3744] hover:bg-[#124b5d] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Person</span>
        </button>
      </div>

      {/* Debt Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div
          onClick={() => setActiveTab('to_take')}
          className={`cursor-pointer bg-white rounded-2xl border p-5 transition shadow-xs ${
            activeTab === 'to_take'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20'
              : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4" />
              To Take (Owed to Me)
            </span>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
              Receivable
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">
            {formatCurrency(totalOwedToMe, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total amount friends and colleagues owe you
          </div>
        </div>

        <div
          onClick={() => setActiveTab('to_give')}
          className={`cursor-pointer bg-white rounded-2xl border p-5 transition shadow-xs ${
            activeTab === 'to_give'
              ? 'border-amber-500 ring-2 ring-amber-500/20'
              : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
              <ArrowDownLeft className="w-4 h-4" />
              To Give (Money I Owe)
            </span>
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold">
              Liability
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">
            {formatCurrency(totalIOwe, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total amount you need to pay back
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Requirement: Distinct section divided into two tabs/views: "To Give" and "To Take" */}
        <div className="flex w-full sm:w-auto bg-slate-100 p-1 rounded-xl">
          <button
            id="tab-to-take"
            onClick={() => setActiveTab('to_take')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'to_take'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>To Take ({toTakeCount})</span>
          </button>

          <button
            id="tab-to-give"
            onClick={() => setActiveTab('to_give')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'to_give'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>To Give ({toGiveCount})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search person by name..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 animate-pulse h-28" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredPeople.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center shadow-xs">
          <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-7 h-7" />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">
            {activeTab === 'to_take' ? 'No One Owes You Money' : 'You Don’t Owe Anyone Money'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
            {activeTab === 'to_take'
              ? 'When you lend money or split a bill, add them here to track repayments.'
              : 'Keep track of borrowed funds and loans so you never forget to settle up.'}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0c3744] hover:bg-[#124b5d] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
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
                className="bg-white rounded-2xl border border-slate-200/90 p-4 hover:border-teal-500/80 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Initials Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0c3744] to-[#145668] text-white font-bold text-sm flex items-center justify-center shadow-xs">
                      {person.name.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-teal-700 transition">
                        {person.name}
                      </h4>
                      {person.phone && (
                        <p className="text-[11px] text-slate-400">{person.phone}</p>
                      )}
                      {person.notes && (
                        <p className="text-[11px] text-slate-400 italic line-clamp-1">{person.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Balance Badge */}
                  <div className="text-right">
                    <div
                      className={`text-base font-black ${
                        isOwedToMe
                          ? 'text-emerald-600'
                          : isOwedByMe
                          ? 'text-amber-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {isOwedToMe && `+${formatCurrency(person.balance, currency)}`}
                      {isOwedByMe && `-${formatCurrency(Math.abs(person.balance), currency)}`}
                      {isSettled && formatCurrency(0, currency)}
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      {isOwedToMe ? 'Owes you' : isOwedByMe ? 'You owe' : 'Settled'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Click to view ledger & settle</span>
                  <span className="text-teal-700 font-bold group-hover:underline">Open Ledger →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Person Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-teal-700" />
                Add New Person
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePerson} className="p-6 space-y-4">
              {errorMessage && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555-0199"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Colleague from work, Roommate"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Initial Balance (Optional)
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setInitialType('give')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      initialType === 'give'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>They Owe Me</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInitialType('take')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      initialType === 'take'
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700'
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <input
                    type="text"
                    value={initialReason}
                    onChange={(e) => setInitialReason(e.target.value)}
                    placeholder="Reason for debt"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#0c3744] hover:bg-[#124b5d] text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-teal-300" />
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
