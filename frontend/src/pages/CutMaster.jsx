import React, { useState, useEffect } from 'react';
import { cutAPI, masterDataAPI } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import {
  Percent,
  Calendar,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  X,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Building2,
  User,
  FileText,
} from 'lucide-react';

export const CutMaster = () => {
  const [cuts, setCuts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ todayTotal: 0, monthTotal: 0, overallTotal: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedPeriod, setSelectedPeriod] = useState('all'); // today, yesterday, thismonth, all, custom
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });

  // Center & Category Datalist state
  const [categories, setCategories] = useState([
    'LAB INVESTIGATION CUT',
    'X-RAY / RADIOLOGY COMMISSION',
    'SONOGRAPHY / USG CUT',
    'CT-SCAN / MRI REFERRAL',
    'PATHOLOGY COMMISSION',
    'HOSPITAL ADMISSION REFERRAL',
    'SPECIALIST CONSULTATION CUT',
    'SURGICAL REFERRAL',
    'PHARMACY COMMISSION',
    'MISCELLANEOUS REFERRAL',
  ]);

  const [centers, setCenters] = useState([
    'CARE DIAGNOSTICS',
    'SURAT IMAGING & MRI CENTER',
    'SHIVAM PATHOLOGY LAB',
    'METROPOLIS HEALTHCARE',
    'DR. LAL PATHLABS',
    'KRISHNA X-RAY CLINIC',
    'STERLING DIAGNOSTICS',
    'CITY HOSPITAL',
  ]);

  // Form State
  const initialForm = {
    date: new Date().toISOString().split('T')[0],
    centerName: '',
    patientName: '',
    category: '',
    amount: '',
    paymentMode: 'Cash',
    reference: '',
    notes: '',
  };
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, text: '', type: 'success' });

  const showToast = (text, type = 'success') => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: '', type: 'success' }), 3500);
  };

  // Load existing cut categories and centers from Master Data
  const loadMasterDatalists = async () => {
    try {
      const [catRes, centerRes] = await Promise.all([
        masterDataAPI.getItems('cut_category', '', 1, 100),
        masterDataAPI.getItems('center', '', 1, 100),
      ]);
      if (catRes?.success && Array.isArray(catRes.data) && catRes.data.length > 0) {
        const catList = catRes.data.map((c) => c.value?.toUpperCase()).filter(Boolean);
        setCategories((prev) => [...new Set([...prev, ...catList])]);
      }
      if (centerRes?.success && Array.isArray(centerRes.data) && centerRes.data.length > 0) {
        const centerList = centerRes.data.map((c) => c.value?.toUpperCase()).filter(Boolean);
        setCenters((prev) => [...new Set([...prev, ...centerList])]);
      }
    } catch (e) {
      console.warn('Could not load master datalists for cut master:', e);
    }
  };

  const fetchCuts = async () => {
    try {
      setLoading(true);
      const params = {
        period: selectedPeriod,
        search: debouncedSearch.trim(),
      };
      if (selectedPeriod === 'custom' && selectedDate) {
        params.date = selectedDate;
      }
      const [listRes, sumRes] = await Promise.all([
        cutAPI.getAll(params),
        cutAPI.getSummary(),
      ]);
      if (listRes?.success) {
        setCuts(listRes.cuts || []);
      }
      if (sumRes?.success) {
        setSummary(sumRes.summary || { todayTotal: 0, monthTotal: 0, overallTotal: 0 });
      }
    } catch (err) {
      console.error('Error fetching cuts:', err);
      showToast('Failed to load cut records: ' + (err.message || 'Server error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterDatalists();
  }, []);

  useEffect(() => {
    fetchCuts();
  }, [debouncedSearch, selectedPeriod, selectedDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.centerName.trim()) {
      showToast('Please specify a diagnostic center / lab / source name.', 'error');
      return;
    }
    if (!form.category.trim()) {
      showToast('Please select or type a cut commission category.', 'error');
      return;
    }
    const num = Number(form.amount);
    if (!num || num <= 0) {
      showToast('Please enter a valid positive cut amount.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...form,
        centerName: form.centerName.trim().toUpperCase(),
        category: form.category.trim().toUpperCase(),
        amount: num,
      };

      if (editingId) {
        const res = await cutAPI.update(editingId, payload);
        if (res?.success) {
          showToast('Cut commission record updated successfully!');
          setEditingId(null);
          setForm(initialForm);
          fetchCuts();
        } else {
          showToast(res?.message || 'Failed to update cut record', 'error');
        }
      } else {
        const res = await cutAPI.create(payload);
        if (res?.success) {
          showToast('Cut commission recorded! Added directly to Today\'s Income.');
          // Auto remember category and center in local datalists
          if (!categories.includes(payload.category)) {
            setCategories((prev) => [...prev, payload.category]);
          }
          if (!centers.includes(payload.centerName)) {
            setCenters((prev) => [...prev, payload.centerName]);
          }
          setForm(initialForm);
          fetchCuts();
        } else {
          showToast(res?.message || 'Failed to save cut record', 'error');
        }
      }
    } catch (err) {
      console.error('Submit error:', err);
      showToast(err.message || 'Error saving cut record', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (c) => {
    setEditingId(c._id);
    setForm({
      date: c.date || new Date().toISOString().split('T')[0],
      centerName: c.centerName || '',
      patientName: c.patientName || '',
      category: c.category || '',
      amount: c.amount || '',
      paymentMode: c.paymentMode || 'Cash',
      reference: c.reference || '',
      notes: c.notes || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(initialForm);
  };

  const handleDelete = async (id, center, amt) => {
    if (!window.confirm(`Are you sure you want to delete commission from "${center}" (₹${amt})?`)) {
      return;
    }
    try {
      const res = await cutAPI.delete(id);
      if (res?.success) {
        showToast('Cut record deleted successfully');
        if (editingId === id) {
          handleCancelEdit();
        }
        fetchCuts();
      } else {
        showToast(res?.message || 'Failed to delete record', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error deleting record', 'error');
    }
  };

  // Filtered cuts sum for current view
  const currentViewTotal = cuts.reduce((acc, c) => acc + (c.amount || 0), 0);

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-white font-medium text-sm transition-all duration-300 ${
            toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span>{toast.text}</span>
          <button onClick={() => setToast({ show: false, text: '', type: 'success' })} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-700 via-rose-700 to-amber-700 rounded-xl p-5 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
              <Percent className="w-7 h-7 text-amber-200" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                Cut Master (Commission / Referral Income Tracker)
                <span className="text-xs bg-amber-400 text-rose-950 px-2 py-0.5 rounded font-extrabold uppercase">
                  F5
                </span>
              </h1>
              <p className="text-rose-100 text-xs mt-0.5">
                Record commission income from Diagnostic Labs, X-Ray, CT/MRI Centers & Specialist Referrals.
              </p>
            </div>
          </div>
        </div>

        {/* Live sync banner badge */}
        <div className="bg-white/15 border border-white/25 backdrop-blur-md px-4 py-2 rounded-lg flex items-center gap-3 self-start md:self-auto">
          <TrendingUp className="w-5 h-5 text-emerald-300" />
          <div className="text-right">
            <span className="block text-[11px] uppercase tracking-wider text-rose-100 font-semibold">
              Today's Cut Added to Income
            </span>
            <span className="text-lg font-black text-white">
              + ₹{summary.todayTotal.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Cut Income */}
        <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Today's Cut Income</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-gray-900">
            ₹{summary.todayTotal.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Added to Today's Clinic Income
          </p>
        </div>

        {/* This Month's Cut Income */}
        <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-blue-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">This Month's Cut</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-gray-900">
            ₹{summary.monthTotal.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Total referral commissions this month</p>
        </div>

        {/* Overall Total Cut Income */}
        <div className="bg-white rounded-xl border border-purple-200 p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-purple-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Overall Cut Income</span>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-gray-900">
            ₹{summary.overallTotal.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Cumulative diagnostic commission</p>
        </div>

        {/* Current View Filter Total */}
        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Filtered View Total</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-gray-900">
            ₹{currentViewTotal.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {cuts.length} {cuts.length === 1 ? 'record' : 'records'} in current filter
          </p>
        </div>
      </div>

      {/* Main Content: Form + Records Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Entry / Edit Form (4 cols on lg) */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden sticky top-4">
            <div className="bg-gradient-to-r from-red-600 to-rose-700 px-4 py-3 text-white flex items-center justify-between">
              <span className="font-semibold text-sm flex items-center gap-2">
                {editingId ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingId ? 'Edit Cut Commission' : 'Record New Cut Commission'}
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded transition"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>

              {/* Diagnostic Center / Lab Source (Datalist) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Diagnostic Center / Lab / Source <span className="text-red-500">*</span>
                </label>
                <input
                  list="cut-centers"
                  type="text"
                  placeholder="E.g. CARE DIAGNOSTICS, SURAT IMAGING..."
                  value={form.centerName}
                  onChange={(e) => setForm({ ...form, centerName: e.target.value })}
                  required
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 uppercase focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
                <datalist id="cut-centers">
                  {centers.map((c, i) => (
                    <option key={i} value={c} />
                  ))}
                </datalist>
                <span className="text-[10px] text-gray-400">
                  Select from list or type new center (automatically remembered).
                </span>
              </div>

              {/* Patient Name (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Referred Patient Name <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Patient Name (if applicable)"
                  value={form.patientName}
                  onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>

              {/* Cut Category (Datalist) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Commission / Cut Category <span className="text-red-500">*</span>
                </label>
                <input
                  list="cut-categories"
                  type="text"
                  placeholder="E.g. LAB INVESTIGATION CUT, X-RAY..."
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 uppercase focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
                <datalist id="cut-categories">
                  {categories.map((cat, i) => (
                    <option key={i} value={cat} />
                  ))}
                </datalist>
                <span className="text-[10px] text-gray-400">
                  New categories automatically saved to Master Data.
                </span>
              </div>

              {/* Amount & Payment Mode */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-bold text-gray-900 focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={form.paymentMode}
                    onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Online/UPI">Online/UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reference / Bill No. <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Receipt # / Ref / Bill No."
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notes / Description <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows="2"
                  placeholder="Additional notes about test or cut settlement..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-bold py-2.5 px-4 rounded-lg shadow transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : editingId ? (
                    <Edit className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {editingId ? 'Update Cut Record' : 'Record Cut Commission'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-3 rounded-lg text-sm transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Cut Records Table & Filter Controls (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Quick Period Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'thismonth', label: 'This Month' },
                { id: 'all', label: 'All Time' },
                { id: 'custom', label: 'Custom' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPeriod(p.id)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                    selectedPeriod === p.id
                      ? 'bg-rose-700 text-white shadow-sm'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              {selectedPeriod === 'custom' && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:ring-1 focus:ring-rose-500"
                />
              )}
            </div>

            {/* Search Input & Refresh */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search center, patient, cat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
              <button
                onClick={fetchCuts}
                title="Refresh Records"
                className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-rose-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Diagnostic Center / Source</th>
                    <th className="py-2.5 px-3">Patient</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3">Ref / Notes</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading && cuts.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-10 text-gray-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
                        Loading cut records...
                      </td>
                    </tr>
                  ) : cuts.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-12 text-gray-400">
                        <Percent className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        No cut commission records found for this period.
                      </td>
                    </tr>
                  ) : (
                    cuts.map((c) => (
                      <tr key={c._id} className="hover:bg-rose-50/40 transition">
                        <td className="py-2 px-3 whitespace-nowrap font-medium text-gray-700">
                          {c.date}
                        </td>
                        <td className="py-2 px-3 font-semibold text-gray-900">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span>{c.centerName}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-gray-700">
                          {c.patientName ? (
                            <span className="font-medium text-blue-900">{c.patientName}</span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                            {c.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-black text-emerald-700 whitespace-nowrap text-sm">
                          + ₹{c.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2 px-3 text-gray-600 whitespace-nowrap">
                          {c.paymentMode || 'Cash'}
                        </td>
                        <td className="py-2 px-3 text-gray-500 max-w-[150px] truncate">
                          {c.reference && <span className="font-mono text-gray-700 mr-1">[{c.reference}]</span>}
                          {c.notes || '-'}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEdit(c)}
                              title="Edit Record"
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(c._id, c.centerName, c.amount)}
                              title="Delete Record"
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            {cuts.length > 0 && (
              <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-between text-xs font-bold text-gray-800">
                <span>Total Commission in Selected View ({cuts.length} entries):</span>
                <span className="text-emerald-700 text-sm font-black">
                  + ₹{currentViewTotal.toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CutMaster;
