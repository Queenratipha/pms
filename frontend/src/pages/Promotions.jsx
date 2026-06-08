import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const DISCOUNT_TYPES = ['Free','Percentage','Flat Rate','Cashback','Buy-One-Get-One','Bundle'];
const STATUSES       = ['Active','Inactive','Expired'];
const empty = { Title:'', Description:'', Discount_Type:'Percentage', Discount_Value:'0', Start_Date:'', End_Date:'', Status:'Active' };

function validate(f) {
  const e = {};
  if (!f.Title.trim())      e.Title      = 'Title is required.';
  if (!f.Discount_Type)     e.Discount_Type = 'Discount type is required.';
  if (!f.Start_Date)        e.Start_Date = 'Start date is required.';
  if (!f.End_Date)          e.End_Date   = 'End date is required.';
  else if (f.Start_Date && new Date(f.End_Date) < new Date(f.Start_Date))
    e.End_Date = 'End date must be on or after start date.';
  if (isNaN(f.Discount_Value) || Number(f.Discount_Value) < 0)
    e.Discount_Value = 'Discount value must be 0 or more.';
  return e;
}

export default function Promotions() {
  const [promos,  setPromos]  = useState([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [form,    setForm]    = useState(empty);
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/promotions', { params: { search } });
      setPromos(r.data);
    } catch { toast.error('Failed to load promotions.'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const toDateInput = (d) => d ? d.split('T')[0] : '';

  const openAdd  = () => { setEditing(null); setForm(empty); setErrors({}); setModal(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ ...p, Start_Date: toDateInput(p.Start_Date), End_Date: toDateInput(p.End_Date),
      Discount_Value: String(p.Discount_Value) });
    setErrors({}); setModal(true);
  };
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
        await api.put(`/promotions/${editing.PromotionID}`, form);
        toast.success('Promotion updated.');
      } else {
        await api.post('/promotions', form);
        toast.success('Promotion created.');
      }
      closeModal(); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving promotion.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete promotion "${title}"?`)) return;
    try {
      await api.delete(`/promotions/${id}`);
      toast.success('Promotion deleted.');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed.'); }
  };

  const statusBadge = (s) => {
    const map = { Active:'badge-active', Inactive:'badge-inactive', Expired:'badge-expired' };
    return <span className={map[s] || 'badge-inactive'}>{s}</span>;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Promotions</h2>
          <p className="text-sm text-gray-500">{promos.length} record{promos.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-3">
          <input type="text" placeholder="Search title or type…"
            value={search} onChange={e => setSearch(e.target.value)} className="input-field max-w-xs" />
          <button onClick={openAdd} className="btn-primary whitespace-nowrap">+ Add Promotion</button>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['#','Title','Type','Value','Start','End','Status','Created By','Actions'].map(h => (
                <th key={h} className="table-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={9} className="table-td text-center py-8 text-gray-400">Loading…</td></tr>
            ) : promos.length === 0 ? (
              <tr><td colSpan={9} className="table-td text-center py-8 text-gray-400">No promotions found.</td></tr>
            ) : promos.map(p => (
              <tr key={p.PromotionID} className="hover:bg-gray-50 transition-colors">
                <td className="table-td text-gray-400">{p.PromotionID}</td>
                <td className="table-td font-medium max-w-[160px] truncate" title={p.Title}>{p.Title}</td>
                <td className="table-td">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                    {p.Discount_Type}
                  </span>
                </td>
                <td className="table-td">{p.Discount_Type === 'Free' ? '—' : Number(p.Discount_Value).toLocaleString()}</td>
                <td className="table-td">{toDateInput(p.Start_Date)}</td>
                <td className="table-td">{toDateInput(p.End_Date)}</td>
                <td className="table-td">{statusBadge(p.Status)}</td>
                <td className="table-td text-gray-500">{p.CreatedByName || '—'}</td>
                <td className="table-td">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                    <button onClick={() => handleDelete(p.PromotionID, p.Title)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={closeModal} title={editing ? 'Edit Promotion' : 'Add Promotion'}>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input name="Title" value={form.Title} onChange={handleChange}
              className={`input-field ${errors.Title ? 'border-red-500' : ''}`}
              placeholder="Summer Sale 2026" />
            {errors.Title && <p className="text-red-500 text-xs mt-1">{errors.Title}</p>}
          </div>
          <div>
            <label className="label">Description</label>
            <textarea name="Description" value={form.Description} onChange={handleChange}
              rows={3} className="input-field resize-none" placeholder="Describe the promotion…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Discount Type *</label>
              <select name="Discount_Type" value={form.Discount_Type} onChange={handleChange}
                className={`input-field ${errors.Discount_Type ? 'border-red-500' : ''}`}>
                {DISCOUNT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              {errors.Discount_Type && <p className="text-red-500 text-xs mt-1">{errors.Discount_Type}</p>}
            </div>
            <div>
              <label className="label">Discount Value</label>
              <input type="number" name="Discount_Value" value={form.Discount_Value} onChange={handleChange}
                className={`input-field ${errors.Discount_Value ? 'border-red-500' : ''}`}
                min="0" placeholder="0" />
              {errors.Discount_Value && <p className="text-red-500 text-xs mt-1">{errors.Discount_Value}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date *</label>
              <input type="date" name="Start_Date" value={form.Start_Date} onChange={handleChange}
                className={`input-field ${errors.Start_Date ? 'border-red-500' : ''}`} />
              {errors.Start_Date && <p className="text-red-500 text-xs mt-1">{errors.Start_Date}</p>}
            </div>
            <div>
              <label className="label">End Date *</label>
              <input type="date" name="End_Date" value={form.End_Date} onChange={handleChange}
                className={`input-field ${errors.End_Date ? 'border-red-500' : ''}`} />
              {errors.End_Date && <p className="text-red-500 text-xs mt-1">{errors.End_Date}</p>}
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select name="Status" value={form.Status} onChange={handleChange} className="input-field">
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : editing ? 'Update' : 'Add Promotion'}
            </button>
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
