import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const STATUSES = ['Active','Inactive','Blocked'];
const empty = { FirstName:'', LastName:'', Email:'', PhoneNumber:'', Status:'Active' };

function validate(f) {
  const e = {};
  if (!f.FirstName.trim())   e.FirstName   = 'First name is required.';
  if (!f.LastName.trim())    e.LastName    = 'Last name is required.';
  if (!f.Email.trim())       e.Email       = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.Email)) e.Email = 'Enter a valid email address.';
  if (!f.PhoneNumber.trim()) e.PhoneNumber = 'Phone number is required.';
  else if (!/^[+\d\s\-()]{7,20}$/.test(f.PhoneNumber)) e.PhoneNumber = 'Enter a valid phone number.';
  return e;
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(empty);
  const [errors,    setErrors]    = useState({});
  const [saving,    setSaving]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/customers', { params: { search } });
      setCustomers(r.data);
    } catch { toast.error('Failed to load customers.'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditing(null); setForm(empty); setErrors({}); setModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ ...c }); setErrors({}); setModal(true); };
  const closeModal = () => { setModal(false); setEditing(null); };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/customers/${editing.CustomerID}`, form);
        toast.success('Customer updated.');
      } else {
        await api.post('/customers', form);
        toast.success('Customer added.');
      }
      closeModal(); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving customer.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete customer ${name}?`)) return;
    try {
      await api.delete(`/customers/${id}`);
      toast.success('Customer deleted.');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed.'); }
  };

  const statusBadge = (s) => {
    const map = { Active:'badge-active', Inactive:'badge-inactive', Blocked:'badge-blocked' };
    return <span className={map[s] || 'badge-inactive'}>{s}</span>;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Customers</h2>
          <p className="text-sm text-gray-500">{customers.length} record{customers.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-3">
          <input type="text" placeholder="Search name, email, phone…"
            value={search} onChange={e => setSearch(e.target.value)} className="input-field max-w-xs" />
          <button onClick={openAdd} className="btn-primary whitespace-nowrap">+ Add Customer</button>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['#','Name','Email','Phone','Status','Registered By','Date','Actions'].map(h => (
                <th key={h} className="table-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="table-td text-center py-8 text-gray-400">Loading…</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={8} className="table-td text-center py-8 text-gray-400">No customers found.</td></tr>
            ) : customers.map(c => (
              <tr key={c.CustomerID} className="hover:bg-gray-50 transition-colors">
                <td className="table-td text-gray-400">{c.CustomerID}</td>
                <td className="table-td font-medium">{c.FirstName} {c.LastName}</td>
                <td className="table-td">{c.Email}</td>
                <td className="table-td">{c.PhoneNumber}</td>
                <td className="table-td">{statusBadge(c.Status)}</td>
                <td className="table-td text-gray-500">{c.RegisteredByName || '—'}</td>
                <td className="table-td text-gray-500">{new Date(c.CreatedAt).toLocaleDateString()}</td>
                <td className="table-td">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                    <button onClick={() => handleDelete(c.CustomerID, `${c.FirstName} ${c.LastName}`)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={closeModal} title={editing ? 'Edit Customer' : 'Add Customer'}>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input name="FirstName" value={form.FirstName} onChange={handleChange}
                className={`input-field ${errors.FirstName ? 'border-red-500' : ''}`} placeholder="Jane" />
              {errors.FirstName && <p className="text-red-500 text-xs mt-1">{errors.FirstName}</p>}
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input name="LastName" value={form.LastName} onChange={handleChange}
                className={`input-field ${errors.LastName ? 'border-red-500' : ''}`} placeholder="Doe" />
              {errors.LastName && <p className="text-red-500 text-xs mt-1">{errors.LastName}</p>}
            </div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" name="Email" value={form.Email} onChange={handleChange}
              className={`input-field ${errors.Email ? 'border-red-500' : ''}`} placeholder="jane@example.com" />
            {errors.Email && <p className="text-red-500 text-xs mt-1">{errors.Email}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Phone Number *</label>
              <input name="PhoneNumber" value={form.PhoneNumber} onChange={handleChange}
                className={`input-field ${errors.PhoneNumber ? 'border-red-500' : ''}`} placeholder="+250 7xx xxx xxx" />
              {errors.PhoneNumber && <p className="text-red-500 text-xs mt-1">{errors.PhoneNumber}</p>}
            </div>
            <div>
              <label className="label">Status</label>
              <select name="Status" value={form.Status} onChange={handleChange} className="input-field">
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : editing ? 'Update' : 'Add Customer'}
            </button>
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
