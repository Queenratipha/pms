import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const TYPES    = ['Sedan','SUV','Truck','Van','Motorcycle','Bus','Other'];
const STATUSES = ['Available','Rented','Sold','Under Maintenance'];

const empty = { Plate_Number:'', Brand:'', Model:'', Year:'', Vehicle_Type:'Sedan', Purchase_Price:'', Status:'Available' };

function validate(f, isEdit) {
  const e = {};
  if (!isEdit && !f.Plate_Number.trim()) e.Plate_Number = 'Plate number is required.';
  if (!f.Brand.trim())    e.Brand    = 'Brand is required.';
  if (!f.Model.trim())    e.Model    = 'Model is required.';
  if (!f.Year)            e.Year     = 'Year is required.';
  else if (f.Year < 1900 || f.Year > new Date().getFullYear() + 1) e.Year = 'Enter a valid year.';
  if (!f.Purchase_Price)  e.Purchase_Price = 'Purchase price is required.';
  else if (isNaN(f.Purchase_Price) || Number(f.Purchase_Price) <= 0) e.Purchase_Price = 'Enter a valid positive price.';
  return e;
}

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(empty);
  const [errors,   setErrors]   = useState({});
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/vehicles', { params: { search } });
      setVehicles(r.data);
    } catch { toast.error('Failed to load vehicles.'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditing(null); setForm(empty); setErrors({}); setModal(true); };
  const openEdit = (v) => {
    setEditing(v);
    setForm({ ...v, Year: String(v.Year), Purchase_Price: String(v.Purchase_Price) });
    setErrors({});
    setModal(true);
  };
  const closeModal = () => { setModal(false); setEditing(null); };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form, !!editing);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/vehicles/${editing.Plate_Number}`, form);
        toast.success('Vehicle updated.');
      } else {
        await api.post('/vehicles', form);
        toast.success('Vehicle added.');
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving vehicle.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (plate) => {
    if (!window.confirm(`Delete vehicle ${plate}?`)) return;
    try {
      await api.delete(`/vehicles/${plate}`);
      toast.success('Vehicle deleted.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    }
  };

  const statusBadge = (s) => {
    const map = { Available:'badge-active', Rented:'badge-inactive', Sold:'badge-expired', 'Under Maintenance':'badge-blocked' };
    return <span className={map[s] || 'badge-inactive'}>{s}</span>;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Vehicles</h2>
          <p className="text-sm text-gray-500">{vehicles.length} record{vehicles.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search plate, brand, model…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field max-w-xs"
          />
          <button onClick={openAdd} className="btn-primary whitespace-nowrap">+ Add Vehicle</button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Plate Number','Brand','Model','Year','Type','Price (RWF)','Status','Actions'].map(h => (
                <th key={h} className="table-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="table-td text-center py-8 text-gray-400">Loading…</td></tr>
            ) : vehicles.length === 0 ? (
              <tr><td colSpan={8} className="table-td text-center py-8 text-gray-400">No vehicles found.</td></tr>
            ) : vehicles.map(v => (
              <tr key={v.Plate_Number} className="hover:bg-gray-50 transition-colors">
                <td className="table-td font-mono font-medium">{v.Plate_Number}</td>
                <td className="table-td">{v.Brand}</td>
                <td className="table-td">{v.Model}</td>
                <td className="table-td">{v.Year}</td>
                <td className="table-td">{v.Vehicle_Type}</td>
                <td className="table-td">{Number(v.Purchase_Price).toLocaleString()}</td>
                <td className="table-td">{statusBadge(v.Status)}</td>
                <td className="table-td">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(v)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                    <button onClick={() => handleDelete(v.Plate_Number)} className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal open={modal} onClose={closeModal} title={editing ? 'Edit Vehicle' : 'Add Vehicle'}>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {!editing && (
            <div>
              <label className="label">Plate Number *</label>
              <input name="Plate_Number" value={form.Plate_Number} onChange={handleChange}
                className={`input-field ${errors.Plate_Number ? 'border-red-500' : ''}`}
                placeholder="e.g. RAB 123 A" />
              {errors.Plate_Number && <p className="text-red-500 text-xs mt-1">{errors.Plate_Number}</p>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Brand *</label>
              <input name="Brand" value={form.Brand} onChange={handleChange}
                className={`input-field ${errors.Brand ? 'border-red-500' : ''}`} placeholder="Toyota" />
              {errors.Brand && <p className="text-red-500 text-xs mt-1">{errors.Brand}</p>}
            </div>
            <div>
              <label className="label">Model *</label>
              <input name="Model" value={form.Model} onChange={handleChange}
                className={`input-field ${errors.Model ? 'border-red-500' : ''}`} placeholder="Hilux" />
              {errors.Model && <p className="text-red-500 text-xs mt-1">{errors.Model}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Year *</label>
              <input type="number" name="Year" value={form.Year} onChange={handleChange}
                className={`input-field ${errors.Year ? 'border-red-500' : ''}`} placeholder="2023" />
              {errors.Year && <p className="text-red-500 text-xs mt-1">{errors.Year}</p>}
            </div>
            <div>
              <label className="label">Vehicle Type *</label>
              <select name="Vehicle_Type" value={form.Vehicle_Type} onChange={handleChange} className="input-field">
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Purchase Price (RWF) *</label>
              <input type="number" name="Purchase_Price" value={form.Purchase_Price} onChange={handleChange}
                className={`input-field ${errors.Purchase_Price ? 'border-red-500' : ''}`} placeholder="5000000" />
              {errors.Purchase_Price && <p className="text-red-500 text-xs mt-1">{errors.Purchase_Price}</p>}
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
              {saving ? 'Saving…' : editing ? 'Update' : 'Add Vehicle'}
            </button>
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
