import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────
const CUST_STATUSES    = ['Active', 'Inactive', 'Blocked'];
const DISCOUNT_TYPES   = ['Free', 'Percentage', 'Flat Rate', 'Cashback', 'Buy-One-Get-One', 'Bundle'];
const PROMO_STATUSES   = ['Active', 'Inactive', 'Expired'];
const VEH_TYPES        = ['Sedan', 'SUV', 'Truck', 'Van', 'Motorcycle', 'Bus', 'Other'];
const VEH_STATUSES     = ['Available', 'Rented', 'Sold', 'Under Maintenance'];

const emptyCustomer  = { FirstName: '', LastName: '', Email: '', PhoneNumber: '', Status: 'Active' };
const emptyPromotion = { Title: '', Description: '', Discount_Type: 'Percentage', Discount_Value: '0', Start_Date: '', End_Date: '', Status: 'Active' };
const emptyVehicle   = { Plate_Number: '', Brand: '', Model: '', Year: '', Vehicle_Type: 'Sedan', Purchase_Price: '', Status: 'Available' };
const emptyPV        = { PromotionID: '', Plate_Number: '', Performance: '' };

// ─── Validators ───────────────────────────────────────────────
function validateCustomer(f) {
  const e = {};
  if (!f.FirstName.trim())   e.FirstName   = 'First name is required.';
  if (!f.LastName.trim())    e.LastName    = 'Last name is required.';
  if (!f.Email.trim())       e.Email       = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.Email)) e.Email = 'Enter a valid email.';
  if (!f.PhoneNumber.trim()) e.PhoneNumber = 'Phone is required.';
  else if (!/^[+\d\s\-()]{7,20}$/.test(f.PhoneNumber)) e.PhoneNumber = 'Enter a valid phone number.';
  return e;
}
function validatePromotion(f) {
  const e = {};
  if (!f.Title.trim())  e.Title      = 'Title is required.';
  if (!f.Start_Date)    e.Start_Date = 'Start date is required.';
  if (!f.End_Date)      e.End_Date   = 'End date is required.';
  else if (f.Start_Date && new Date(f.End_Date) < new Date(f.Start_Date))
    e.End_Date = 'End date must be after start date.';
  if (isNaN(f.Discount_Value) || Number(f.Discount_Value) < 0)
    e.Discount_Value = 'Must be 0 or more.';
  return e;
}
function validateVehicle(f, isEdit) {
  const e = {};
  if (!isEdit && !f.Plate_Number.trim()) e.Plate_Number = 'Plate number is required.';
  if (!f.Brand.trim())   e.Brand    = 'Brand is required.';
  if (!f.Model.trim())   e.Model    = 'Model is required.';
  if (!f.Year)           e.Year     = 'Year is required.';
  else if (f.Year < 1900 || f.Year > new Date().getFullYear() + 1) e.Year = 'Enter a valid year.';
  if (!f.Purchase_Price) e.Purchase_Price = 'Price is required.';
  else if (isNaN(f.Purchase_Price) || Number(f.Purchase_Price) <= 0) e.Purchase_Price = 'Enter a valid price.';
  return e;
}

// ─── Badge helpers ────────────────────────────────────────────
const custBadge = (s) => {
  const m = { Active: 'badge-active', Inactive: 'badge-inactive', Blocked: 'badge-blocked' };
  return <span className={m[s] || 'badge-inactive'}>{s}</span>;
};
const promoBadge = (s) => {
  const m = { Active: 'badge-active', Inactive: 'badge-inactive', Expired: 'badge-expired' };
  return <span className={m[s] || 'badge-inactive'}>{s}</span>;
};
const vehBadge = (s) => {
  const m = { Available: 'badge-active', Rented: 'badge-inactive', Sold: 'badge-expired', 'Under Maintenance': 'badge-blocked' };
  return <span className={m[s] || 'badge-inactive'}>{s}</span>;
};
const toDate = (d) => (d ? d.split('T')[0] : '');

// ══════════════════════════════════════════════════════════════
export default function Reports() {
  const [activeTab, setActiveTab] = useState('summary');

  // ── Summary report data ──
  const [reportData,   setReportData]   = useState([]);
  const [reportSearch, setReportSearch] = useState('');
  const [reportLoading, setReportLoading] = useState(true);

  // ── Customers ──
  const [customers,   setCustomers]   = useState([]);
  const [custSearch,  setCustSearch]  = useState('');
  const [custLoading, setCustLoading] = useState(false);
  const [custModal,   setCustModal]   = useState(false);
  const [custEditing, setCustEditing] = useState(null);
  const [custForm,    setCustForm]    = useState(emptyCustomer);
  const [custErrors,  setCustErrors]  = useState({});
  const [custSaving,  setCustSaving]  = useState(false);

  // ── Promotions ──
  const [promos,      setPromos]      = useState([]);
  const [promoSearch, setPromoSearch] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoModal,  setPromoModal]  = useState(false);
  const [promoEditing,setPromoEditing]= useState(null);
  const [promoForm,   setPromoForm]   = useState(emptyPromotion);
  const [promoErrors, setPromoErrors] = useState({});
  const [promoSaving, setPromoSaving] = useState(false);

  // ── Vehicles ──
  const [vehicles,    setVehicles]    = useState([]);
  const [vehSearch,   setVehSearch]   = useState('');
  const [vehLoading,  setVehLoading]  = useState(false);
  const [vehModal,    setVehModal]    = useState(false);
  const [vehEditing,  setVehEditing]  = useState(null);
  const [vehForm,     setVehForm]     = useState(emptyVehicle);
  const [vehErrors,   setVehErrors]   = useState({});
  const [vehSaving,   setVehSaving]   = useState(false);

  // ── Promo-Vehicles ──
  const [pvLinks,    setPvLinks]    = useState([]);
  const [pvLoading,  setPvLoading]  = useState(false);
  const [pvModal,    setPvModal]    = useState(false);
  const [pvForm,     setPvForm]     = useState(emptyPV);
  const [pvErrors,   setPvErrors]   = useState({});
  const [pvSaving,   setPvSaving]   = useState(false);

  // ══════════════════════════════════════════════════════════════
  // LOADERS
  // ══════════════════════════════════════════════════════════════
  const loadReport = useCallback(() => {
    setReportLoading(true);
    api.get('/reports/customers-promotions')
      .then(r => setReportData(r.data))
      .catch(() => toast.error('Failed to load report.'))
      .finally(() => setReportLoading(false));
  }, []);

  const loadCustomers = useCallback(async () => {
    setCustLoading(true);
    try { const r = await api.get('/customers', { params: { search: custSearch } }); setCustomers(r.data); }
    catch { toast.error('Failed to load customers.'); }
    finally { setCustLoading(false); }
  }, [custSearch]);

  const loadPromos = useCallback(async () => {
    setPromoLoading(true);
    try { const r = await api.get('/promotions', { params: { search: promoSearch } }); setPromos(r.data); }
    catch { toast.error('Failed to load promotions.'); }
    finally { setPromoLoading(false); }
  }, [promoSearch]);

  const loadVehicles = useCallback(async () => {
    setVehLoading(true);
    try { const r = await api.get('/vehicles', { params: { search: vehSearch } }); setVehicles(r.data); }
    catch { toast.error('Failed to load vehicles.'); }
    finally { setVehLoading(false); }
  }, [vehSearch]);

  const loadPV = useCallback(async () => {
    setPvLoading(true);
    try { const r = await api.get('/promo-vehicles'); setPvLinks(r.data); }
    catch { toast.error('Failed to load promo-vehicles.'); }
    finally { setPvLoading(false); }
  }, []);

  useEffect(() => { loadReport(); }, [loadReport]);
  useEffect(() => { if (activeTab === 'customers')   loadCustomers(); }, [activeTab, loadCustomers]);
  useEffect(() => { if (activeTab === 'promotions')  loadPromos();    }, [activeTab, loadPromos]);
  useEffect(() => { if (activeTab === 'vehicles')    loadVehicles();  }, [activeTab, loadVehicles]);
  useEffect(() => { if (activeTab === 'promoVehicles') loadPV();      }, [activeTab, loadPV]);

  // ══════════════════════════════════════════════════════════════
  // CUSTOMER HANDLERS
  // ══════════════════════════════════════════════════════════════
  const openCustAdd  = () => { setCustEditing(null); setCustForm(emptyCustomer); setCustErrors({}); setCustModal(true); };
  const openCustEdit = (c) => { setCustEditing(c); setCustForm({ ...c }); setCustErrors({}); setCustModal(true); };
  const closeCustModal = () => { setCustModal(false); setCustEditing(null); };

  const handleCustChange = (e) => {
    setCustForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setCustErrors(er => ({ ...er, [e.target.name]: '' }));
  };

  const handleCustSubmit = async (e) => {
    e.preventDefault();
    const errs = validateCustomer(custForm);
    if (Object.keys(errs).length) { setCustErrors(errs); return; }
    setCustSaving(true);
    try {
      if (custEditing) {
        await api.put(`/customers/${custEditing.CustomerID}`, custForm);
        toast.success('Customer updated.');
      } else {
        await api.post('/customers', custForm);
        toast.success('Customer added.');
      }
      closeCustModal(); loadCustomers(); loadReport();
    } catch (err) { toast.error(err.response?.data?.message || 'Error saving customer.'); }
    finally { setCustSaving(false); }
  };

  const handleCustDelete = async (id, name) => {
    if (!window.confirm(`Delete customer "${name}"?`)) return;
    try {
      await api.delete(`/customers/${id}`);
      toast.success('Customer deleted.');
      loadCustomers(); loadReport();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed.'); }
  };

  // ══════════════════════════════════════════════════════════════
  // PROMOTION HANDLERS
  // ══════════════════════════════════════════════════════════════
  const openPromoAdd  = () => { setPromoEditing(null); setPromoForm(emptyPromotion); setPromoErrors({}); setPromoModal(true); };
  const openPromoEdit = (p) => {
    setPromoEditing(p);
    setPromoForm({ ...p, Start_Date: toDate(p.Start_Date), End_Date: toDate(p.End_Date), Discount_Value: String(p.Discount_Value) });
    setPromoErrors({}); setPromoModal(true);
  };
  const closePromoModal = () => { setPromoModal(false); setPromoEditing(null); };

  const handlePromoChange = (e) => {
    setPromoForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setPromoErrors(er => ({ ...er, [e.target.name]: '' }));
  };

  const handlePromoSubmit = async (e) => {
    e.preventDefault();
    const errs = validatePromotion(promoForm);
    if (Object.keys(errs).length) { setPromoErrors(errs); return; }
    setPromoSaving(true);
    try {
      if (promoEditing) {
        await api.put(`/promotions/${promoEditing.PromotionID}`, promoForm);
        toast.success('Promotion updated.');
      } else {
        await api.post('/promotions', promoForm);
        toast.success('Promotion created.');
      }
      closePromoModal(); loadPromos(); loadReport();
    } catch (err) { toast.error(err.response?.data?.message || 'Error saving promotion.'); }
    finally { setPromoSaving(false); }
  };

  const handlePromoDelete = async (id, title) => {
    if (!window.confirm(`Delete promotion "${title}"?`)) return;
    try {
      await api.delete(`/promotions/${id}`);
      toast.success('Promotion deleted.');
      loadPromos(); loadReport();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed.'); }
  };

  // ══════════════════════════════════════════════════════════════
  // VEHICLE HANDLERS
  // ══════════════════════════════════════════════════════════════
  const openVehAdd  = () => { setVehEditing(null); setVehForm(emptyVehicle); setVehErrors({}); setVehModal(true); };
  const openVehEdit = (v) => {
    setVehEditing(v);
    setVehForm({ ...v, Year: String(v.Year), Purchase_Price: String(v.Purchase_Price) });
    setVehErrors({}); setVehModal(true);
  };
  const closeVehModal = () => { setVehModal(false); setVehEditing(null); };

  const handleVehChange = (e) => {
    setVehForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setVehErrors(er => ({ ...er, [e.target.name]: '' }));
  };

  const handleVehSubmit = async (e) => {
    e.preventDefault();
    const errs = validateVehicle(vehForm, !!vehEditing);
    if (Object.keys(errs).length) { setVehErrors(errs); return; }
    setVehSaving(true);
    try {
      if (vehEditing) {
        await api.put(`/vehicles/${vehEditing.Plate_Number}`, vehForm);
        toast.success('Vehicle updated.');
      } else {
        await api.post('/vehicles', vehForm);
        toast.success('Vehicle added.');
      }
      closeVehModal(); loadVehicles();
    } catch (err) { toast.error(err.response?.data?.message || 'Error saving vehicle.'); }
    finally { setVehSaving(false); }
  };

  const handleVehDelete = async (plate) => {
    if (!window.confirm(`Delete vehicle ${plate}?`)) return;
    try {
      await api.delete(`/vehicles/${plate}`);
      toast.success('Vehicle deleted.');
      loadVehicles();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed.'); }
  };

  // ══════════════════════════════════════════════════════════════
  // PROMO-VEHICLE HANDLERS
  // ══════════════════════════════════════════════════════════════
  const openPVAdd   = () => { setPvForm(emptyPV); setPvErrors({}); setPvModal(true); };
  const closePVModal = () => { setPvModal(false); };

  const handlePVChange = (e) => {
    setPvForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setPvErrors(er => ({ ...er, [e.target.name]: '' }));
  };

  const handlePVSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!pvForm.PromotionID)        errs.PromotionID   = 'Select a promotion.';
    if (!pvForm.Plate_Number.trim()) errs.Plate_Number = 'Select a vehicle.';
    if (Object.keys(errs).length) { setPvErrors(errs); return; }
    setPvSaving(true);
    try {
      await api.post('/promo-vehicles', pvForm);
      toast.success('Vehicle assigned to promotion.');
      closePVModal(); loadPV();
    } catch (err) { toast.error(err.response?.data?.message || 'Error assigning vehicle.'); }
    finally { setPvSaving(false); }
  };

  const handlePVDelete = async (id) => {
    if (!window.confirm('Remove this vehicle from the promotion?')) return;
    try {
      await api.delete(`/promo-vehicles/${id}`);
      toast.success('Removed.'); loadPV();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed.'); }
  };

  // ══════════════════════════════════════════════════════════════
  // FILTERED REPORT
  // ══════════════════════════════════════════════════════════════
  const filteredReport = reportData.filter(row =>
    !reportSearch ||
    row.CustomerName.toLowerCase().includes(reportSearch.toLowerCase()) ||
    row.Email.toLowerCase().includes(reportSearch.toLowerCase()) ||
    row.PromotionTitle.toLowerCase().includes(reportSearch.toLowerCase())
  );

  // ══════════════════════════════════════════════════════════════
  // TABS CONFIG
  // ══════════════════════════════════════════════════════════════
  const tabs = [
    { key: 'summary',       label: '📊 Summary Report' },
    { key: 'customers',     label: '👥 Customers' },
    { key: 'promotions',    label: '🏷 Promotions' },
    { key: 'vehicles',      label: '🚗 Vehicles' },
    { key: 'promoVehicles', label: '🔗 Promo-Vehicles' },
  ];

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Reports & Management</h2>
        <p className="text-sm text-gray-500">Full overview and CRUD management across all modules</p>
      </div>

      {/* Tab Bar */}
      <div className="flex flex-wrap gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex-1 min-w-fit px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === t.key
                ? 'bg-white text-blue-700 shadow-sm font-semibold'
                : 'text-gray-600 hover:text-gray-900'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB: SUMMARY REPORT ═══════════════════════════════ */}
      {activeTab === 'summary' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Customer – Promotion Report</h3>
              <p className="text-xs text-gray-500">Active customers matched with currently active promotions</p>
            </div>
            <div className="flex gap-3">
              <input type="text" placeholder="Search…" value={reportSearch}
                onChange={e => setReportSearch(e.target.value)} className="input-field max-w-xs" />
              <button onClick={() => window.print()} className="btn-secondary whitespace-nowrap print:hidden">
                🖨 Print
              </button>
              <button onClick={loadReport} className="btn-secondary whitespace-nowrap">↺ Refresh</button>
            </div>
          </div>

          {/* Summary stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Active Customers',  val: new Set(reportData.map(r => r.CustomerID)).size,   color: 'text-blue-600' },
              { label: 'Active Promotions', val: new Set(reportData.map(r => r.PromotionID)).size,  color: 'text-green-600' },
              { label: 'Total Matches',     val: reportData.length,                                  color: 'text-purple-600' },
              { label: 'Showing',           val: filteredReport.length,                              color: 'text-orange-600' },
            ].map(s => (
              <div key={s.label} className="card text-center py-4">
                <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="card p-0 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Customer', 'Email', 'Phone', 'Cust. Status', 'Promo Title', 'Discount Type', 'Value', 'Start', 'End', 'Promo Status'].map(h => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {reportLoading ? (
                  <tr><td colSpan={10} className="table-td text-center py-8 text-gray-400">Loading report…</td></tr>
                ) : filteredReport.length === 0 ? (
                  <tr><td colSpan={10} className="table-td text-center py-8 text-gray-400">
                    {reportData.length === 0 ? 'No active customers with active promotions.' : 'No matches for your search.'}
                  </td></tr>
                ) : filteredReport.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-medium">{row.CustomerName}</td>
                    <td className="table-td">{row.Email}</td>
                    <td className="table-td">{row.PhoneNumber}</td>
                    <td className="table-td">{custBadge(row.CustomerStatus)}</td>
                    <td className="table-td font-medium text-blue-700">{row.PromotionTitle}</td>
                    <td className="table-td">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700">
                        {row.Discount_Type}
                      </span>
                    </td>
                    <td className="table-td">
                      {row.Discount_Type === 'Free' ? '—' : Number(row.Discount_Value).toLocaleString()}
                    </td>
                    <td className="table-td text-gray-500">{toDate(row.Start_Date)}</td>
                    <td className="table-td text-gray-500">{toDate(row.End_Date)}</td>
                    <td className="table-td">{promoBadge(row.PromotionStatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ TAB: CUSTOMERS ════════════════════════════════════ */}
      {activeTab === 'customers' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Customers</h3>
              <p className="text-xs text-gray-500">{customers.length} record{customers.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex gap-3">
              <input type="text" placeholder="Search name, email, phone…"
                value={custSearch} onChange={e => setCustSearch(e.target.value)} className="input-field max-w-xs" />
              <button onClick={openCustAdd} className="btn-primary whitespace-nowrap">+ Add Customer</button>
            </div>
          </div>

          <div className="card p-0 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['#', 'Name', 'Email', 'Phone', 'Status', 'Registered By', 'Date', 'Actions'].map(h => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {custLoading ? (
                  <tr><td colSpan={8} className="table-td text-center py-8 text-gray-400">Loading…</td></tr>
                ) : customers.length === 0 ? (
                  <tr><td colSpan={8} className="table-td text-center py-8 text-gray-400">No customers found.</td></tr>
                ) : customers.map(c => (
                  <tr key={c.CustomerID} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td text-gray-400">{c.CustomerID}</td>
                    <td className="table-td font-medium">{c.FirstName} {c.LastName}</td>
                    <td className="table-td">{c.Email}</td>
                    <td className="table-td">{c.PhoneNumber}</td>
                    <td className="table-td">{custBadge(c.Status)}</td>
                    <td className="table-td text-gray-500">{c.RegisteredByName || '—'}</td>
                    <td className="table-td text-gray-500">{new Date(c.CreatedAt).toLocaleDateString()}</td>
                    <td className="table-td">
                      <div className="flex gap-2">
                        <button onClick={() => openCustEdit(c)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors">
                          ✏ Edit
                        </button>
                        <button onClick={() => handleCustDelete(c.CustomerID, `${c.FirstName} ${c.LastName}`)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors">
                          🗑 Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Customer Modal */}
          <Modal open={custModal} onClose={closeCustModal} title={custEditing ? 'Edit Customer' : 'Add Customer'}>
            <form onSubmit={handleCustSubmit} noValidate className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name *</label>
                  <input name="FirstName" value={custForm.FirstName} onChange={handleCustChange}
                    className={`input-field ${custErrors.FirstName ? 'border-red-500' : ''}`} placeholder="Jane" />
                  {custErrors.FirstName && <p className="text-red-500 text-xs mt-1">{custErrors.FirstName}</p>}
                </div>
                <div>
                  <label className="label">Last Name *</label>
                  <input name="LastName" value={custForm.LastName} onChange={handleCustChange}
                    className={`input-field ${custErrors.LastName ? 'border-red-500' : ''}`} placeholder="Doe" />
                  {custErrors.LastName && <p className="text-red-500 text-xs mt-1">{custErrors.LastName}</p>}
                </div>
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" name="Email" value={custForm.Email} onChange={handleCustChange}
                  className={`input-field ${custErrors.Email ? 'border-red-500' : ''}`} placeholder="jane@example.com" />
                {custErrors.Email && <p className="text-red-500 text-xs mt-1">{custErrors.Email}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Phone Number *</label>
                  <input name="PhoneNumber" value={custForm.PhoneNumber} onChange={handleCustChange}
                    className={`input-field ${custErrors.PhoneNumber ? 'border-red-500' : ''}`} placeholder="+250 7xx xxx xxx" />
                  {custErrors.PhoneNumber && <p className="text-red-500 text-xs mt-1">{custErrors.PhoneNumber}</p>}
                </div>
                <div>
                  <label className="label">Status</label>
                  <select name="Status" value={custForm.Status} onChange={handleCustChange} className="input-field">
                    {CUST_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={custSaving} className="btn-primary flex-1">
                  {custSaving ? 'Saving…' : custEditing ? 'Update Customer' : 'Add Customer'}
                </button>
                <button type="button" onClick={closeCustModal} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* ═══ TAB: PROMOTIONS ═══════════════════════════════════ */}
      {activeTab === 'promotions' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Promotions</h3>
              <p className="text-xs text-gray-500">{promos.length} record{promos.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex gap-3">
              <input type="text" placeholder="Search title or type…"
                value={promoSearch} onChange={e => setPromoSearch(e.target.value)} className="input-field max-w-xs" />
              <button onClick={openPromoAdd} className="btn-primary whitespace-nowrap">+ Add Promotion</button>
            </div>
          </div>

          <div className="card p-0 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['#', 'Title', 'Type', 'Value', 'Start', 'End', 'Status', 'Created By', 'Actions'].map(h => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {promoLoading ? (
                  <tr><td colSpan={9} className="table-td text-center py-8 text-gray-400">Loading…</td></tr>
                ) : promos.length === 0 ? (
                  <tr><td colSpan={9} className="table-td text-center py-8 text-gray-400">No promotions found.</td></tr>
                ) : promos.map(p => (
                  <tr key={p.PromotionID} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td text-gray-400">{p.PromotionID}</td>
                    <td className="table-td font-medium max-w-[150px] truncate" title={p.Title}>{p.Title}</td>
                    <td className="table-td">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                        {p.Discount_Type}
                      </span>
                    </td>
                    <td className="table-td">{p.Discount_Type === 'Free' ? '—' : Number(p.Discount_Value).toLocaleString()}</td>
                    <td className="table-td">{toDate(p.Start_Date)}</td>
                    <td className="table-td">{toDate(p.End_Date)}</td>
                    <td className="table-td">{promoBadge(p.Status)}</td>
                    <td className="table-td text-gray-500">{p.CreatedByName || '—'}</td>
                    <td className="table-td">
                      <div className="flex gap-2">
                        <button onClick={() => openPromoEdit(p)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors">
                          ✏ Edit
                        </button>
                        <button onClick={() => handlePromoDelete(p.PromotionID, p.Title)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors">
                          🗑 Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Promotion Modal */}
          <Modal open={promoModal} onClose={closePromoModal} title={promoEditing ? 'Edit Promotion' : 'Add Promotion'}>
            <form onSubmit={handlePromoSubmit} noValidate className="space-y-4">
              <div>
                <label className="label">Title *</label>
                <input name="Title" value={promoForm.Title} onChange={handlePromoChange}
                  className={`input-field ${promoErrors.Title ? 'border-red-500' : ''}`} placeholder="Summer Sale 2026" />
                {promoErrors.Title && <p className="text-red-500 text-xs mt-1">{promoErrors.Title}</p>}
              </div>
              <div>
                <label className="label">Description</label>
                <textarea name="Description" value={promoForm.Description} onChange={handlePromoChange}
                  rows={2} className="input-field resize-none" placeholder="Describe the promotion…" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Discount Type *</label>
                  <select name="Discount_Type" value={promoForm.Discount_Type} onChange={handlePromoChange} className="input-field">
                    {DISCOUNT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Discount Value</label>
                  <input type="number" name="Discount_Value" value={promoForm.Discount_Value} onChange={handlePromoChange}
                    className={`input-field ${promoErrors.Discount_Value ? 'border-red-500' : ''}`} min="0" placeholder="0" />
                  {promoErrors.Discount_Value && <p className="text-red-500 text-xs mt-1">{promoErrors.Discount_Value}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Date *</label>
                  <input type="date" name="Start_Date" value={promoForm.Start_Date} onChange={handlePromoChange}
                    className={`input-field ${promoErrors.Start_Date ? 'border-red-500' : ''}`} />
                  {promoErrors.Start_Date && <p className="text-red-500 text-xs mt-1">{promoErrors.Start_Date}</p>}
                </div>
                <div>
                  <label className="label">End Date *</label>
                  <input type="date" name="End_Date" value={promoForm.End_Date} onChange={handlePromoChange}
                    className={`input-field ${promoErrors.End_Date ? 'border-red-500' : ''}`} />
                  {promoErrors.End_Date && <p className="text-red-500 text-xs mt-1">{promoErrors.End_Date}</p>}
                </div>
              </div>
              <div>
                <label className="label">Status</label>
                <select name="Status" value={promoForm.Status} onChange={handlePromoChange} className="input-field">
                  {PROMO_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={promoSaving} className="btn-primary flex-1">
                  {promoSaving ? 'Saving…' : promoEditing ? 'Update Promotion' : 'Add Promotion'}
                </button>
                <button type="button" onClick={closePromoModal} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* ═══ TAB: VEHICLES ══════════════════════════════════════ */}
      {activeTab === 'vehicles' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Vehicles</h3>
              <p className="text-xs text-gray-500">{vehicles.length} record{vehicles.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex gap-3">
              <input type="text" placeholder="Search plate, brand, model…"
                value={vehSearch} onChange={e => setVehSearch(e.target.value)} className="input-field max-w-xs" />
              <button onClick={openVehAdd} className="btn-primary whitespace-nowrap">+ Add Vehicle</button>
            </div>
          </div>

          <div className="card p-0 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Plate', 'Brand', 'Model', 'Year', 'Type', 'Price (RWF)', 'Status', 'Registered By', 'Actions'].map(h => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {vehLoading ? (
                  <tr><td colSpan={9} className="table-td text-center py-8 text-gray-400">Loading…</td></tr>
                ) : vehicles.length === 0 ? (
                  <tr><td colSpan={9} className="table-td text-center py-8 text-gray-400">No vehicles found.</td></tr>
                ) : vehicles.map(v => (
                  <tr key={v.Plate_Number} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-mono font-medium">{v.Plate_Number}</td>
                    <td className="table-td">{v.Brand}</td>
                    <td className="table-td">{v.Model}</td>
                    <td className="table-td">{v.Year}</td>
                    <td className="table-td">{v.Vehicle_Type}</td>
                    <td className="table-td">{Number(v.Purchase_Price).toLocaleString()}</td>
                    <td className="table-td">{vehBadge(v.Status)}</td>
                    <td className="table-td text-gray-500">{v.RegisteredByName || '—'}</td>
                    <td className="table-td">
                      <div className="flex gap-2">
                        <button onClick={() => openVehEdit(v)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors">
                          ✏ Edit
                        </button>
                        <button onClick={() => handleVehDelete(v.Plate_Number)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors">
                          🗑 Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vehicle Modal */}
          <Modal open={vehModal} onClose={closeVehModal} title={vehEditing ? 'Edit Vehicle' : 'Add Vehicle'}>
            <form onSubmit={handleVehSubmit} noValidate className="space-y-4">
              {!vehEditing && (
                <div>
                  <label className="label">Plate Number *</label>
                  <input name="Plate_Number" value={vehForm.Plate_Number} onChange={handleVehChange}
                    className={`input-field ${vehErrors.Plate_Number ? 'border-red-500' : ''}`} placeholder="RAB 123 A" />
                  {vehErrors.Plate_Number && <p className="text-red-500 text-xs mt-1">{vehErrors.Plate_Number}</p>}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Brand *</label>
                  <input name="Brand" value={vehForm.Brand} onChange={handleVehChange}
                    className={`input-field ${vehErrors.Brand ? 'border-red-500' : ''}`} placeholder="Toyota" />
                  {vehErrors.Brand && <p className="text-red-500 text-xs mt-1">{vehErrors.Brand}</p>}
                </div>
                <div>
                  <label className="label">Model *</label>
                  <input name="Model" value={vehForm.Model} onChange={handleVehChange}
                    className={`input-field ${vehErrors.Model ? 'border-red-500' : ''}`} placeholder="Hilux" />
                  {vehErrors.Model && <p className="text-red-500 text-xs mt-1">{vehErrors.Model}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Year *</label>
                  <input type="number" name="Year" value={vehForm.Year} onChange={handleVehChange}
                    className={`input-field ${vehErrors.Year ? 'border-red-500' : ''}`} placeholder="2023" />
                  {vehErrors.Year && <p className="text-red-500 text-xs mt-1">{vehErrors.Year}</p>}
                </div>
                <div>
                  <label className="label">Vehicle Type *</label>
                  <select name="Vehicle_Type" value={vehForm.Vehicle_Type} onChange={handleVehChange} className="input-field">
                    {VEH_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Purchase Price (RWF) *</label>
                  <input type="number" name="Purchase_Price" value={vehForm.Purchase_Price} onChange={handleVehChange}
                    className={`input-field ${vehErrors.Purchase_Price ? 'border-red-500' : ''}`} placeholder="5000000" />
                  {vehErrors.Purchase_Price && <p className="text-red-500 text-xs mt-1">{vehErrors.Purchase_Price}</p>}
                </div>
                <div>
                  <label className="label">Status</label>
                  <select name="Status" value={vehForm.Status} onChange={handleVehChange} className="input-field">
                    {VEH_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={vehSaving} className="btn-primary flex-1">
                  {vehSaving ? 'Saving…' : vehEditing ? 'Update Vehicle' : 'Add Vehicle'}
                </button>
                <button type="button" onClick={closeVehModal} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* ═══ TAB: PROMO-VEHICLES ════════════════════════════════ */}
      {activeTab === 'promoVehicles' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Promotion – Vehicle Links</h3>
              <p className="text-xs text-gray-500">{pvLinks.length} assignment{pvLinks.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={openPVAdd} className="btn-primary whitespace-nowrap">+ Assign Vehicle</button>
          </div>

          <div className="card p-0 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['#', 'Promotion', 'Plate', 'Brand / Model', 'Performance', 'Assigned', 'Actions'].map(h => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {pvLoading ? (
                  <tr><td colSpan={7} className="table-td text-center py-8 text-gray-400">Loading…</td></tr>
                ) : pvLinks.length === 0 ? (
                  <tr><td colSpan={7} className="table-td text-center py-8 text-gray-400">No assignments yet.</td></tr>
                ) : pvLinks.map(l => (
                  <tr key={l.PromoVehicleID} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td text-gray-400">{l.PromoVehicleID}</td>
                    <td className="table-td font-medium text-blue-700">{l.PromotionTitle}</td>
                    <td className="table-td font-mono">{l.Plate_Number}</td>
                    <td className="table-td">{l.Brand} {l.Model}</td>
                    <td className="table-td text-gray-500">{l.Performance || '—'}</td>
                    <td className="table-td text-gray-500">{new Date(l.AssignedAt).toLocaleDateString()}</td>
                    <td className="table-td">
                      <button onClick={() => handlePVDelete(l.PromoVehicleID)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors">
                        🗑 Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Promo-Vehicle Modal */}
          <Modal open={pvModal} onClose={closePVModal} title="Assign Vehicle to Promotion">
            <form onSubmit={handlePVSubmit} noValidate className="space-y-4">
              <div>
                <label className="label">Promotion (Active only) *</label>
                <select name="PromotionID" value={pvForm.PromotionID} onChange={handlePVChange}
                  className={`input-field ${pvErrors.PromotionID ? 'border-red-500' : ''}`}>
                  <option value="">— Select promotion —</option>
                  {promos.filter(p => p.Status === 'Active').map(p => (
                    <option key={p.PromotionID} value={p.PromotionID}>{p.Title}</option>
                  ))}
                </select>
                {pvErrors.PromotionID && <p className="text-red-500 text-xs mt-1">{pvErrors.PromotionID}</p>}
              </div>
              <div>
                <label className="label">Vehicle *</label>
                <select name="Plate_Number" value={pvForm.Plate_Number} onChange={handlePVChange}
                  className={`input-field ${pvErrors.Plate_Number ? 'border-red-500' : ''}`}>
                  <option value="">— Select vehicle —</option>
                  {vehicles.map(v => (
                    <option key={v.Plate_Number} value={v.Plate_Number}>
                      {v.Plate_Number} – {v.Brand} {v.Model} ({v.Status})
                    </option>
                  ))}
                </select>
                {pvErrors.Plate_Number && <p className="text-red-500 text-xs mt-1">{pvErrors.Plate_Number}</p>}
              </div>
              <div>
                <label className="label">Performance (optional)</label>
                <input name="Performance" value={pvForm.Performance} onChange={handlePVChange}
                  className="input-field" placeholder="e.g. High demand, top performer" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={pvSaving} className="btn-primary flex-1">
                  {pvSaving ? 'Saving…' : 'Assign Vehicle'}
                </button>
                <button type="button" onClick={closePVModal} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </Modal>
        </div>
      )}
    </div>
  );
}
