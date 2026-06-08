import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const empty = { PromotionID:'', Plate_Number:'', Performance:'' };

function validate(f) {
  const e = {};
  if (!f.PromotionID)       e.PromotionID   = 'Select a promotion.';
  if (!f.Plate_Number.trim()) e.Plate_Number = 'Select a vehicle.';
  return e;
}

export default function PromoVehicles() {
  const [links,      setLinks]     = useState([]);
  const [promos,     setPromos]    = useState([]);
  const [vehicles,   setVehicles]  = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [modal,      setModal]     = useState(false);
  const [form,       setForm]      = useState(empty);
  const [errors,     setErrors]    = useState({});
  const [saving,     setSaving]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, p, v] = await Promise.all([
        api.get('/promo-vehicles'),
        api.get('/promotions'),
        api.get('/vehicles'),
      ]);
      setLinks(l.data);
      setPromos(p.data.filter(x => x.Status === 'Active'));
      setVehicles(v.data);
    } catch { toast.error('Failed to load data.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setForm(empty); setErrors({}); setModal(true); };
  const closeModal = () => { setModal(false); };

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
      await api.post('/promo-vehicles', form);
      toast.success('Vehicle assigned to promotion.');
      closeModal(); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error assigning vehicle.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this vehicle from the promotion?')) return;
    try {
      await api.delete(`/promo-vehicles/${id}`);
      toast.success('Removed.');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed.'); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Promotion Vehicles</h2>
          <p className="text-sm text-gray-500">Links between promotions and vehicles</p>
        </div>
        <button onClick={openAdd} className="btn-primary whitespace-nowrap">+ Assign Vehicle</button>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['#','Promotion','Vehicle','Brand / Model','Performance','Assigned At','Actions'].map(h => (
                <th key={h} className="table-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="table-td text-center py-8 text-gray-400">Loading…</td></tr>
            ) : links.length === 0 ? (
              <tr><td colSpan={7} className="table-td text-center py-8 text-gray-400">No assignments yet.</td></tr>
            ) : links.map(l => (
              <tr key={l.PromoVehicleID} className="hover:bg-gray-50 transition-colors">
                <td className="table-td text-gray-400">{l.PromoVehicleID}</td>
                <td className="table-td font-medium">{l.PromotionTitle}</td>
                <td className="table-td font-mono">{l.Plate_Number}</td>
                <td className="table-td">{l.Brand} {l.Model}</td>
                <td className="table-td">{l.Performance || '—'}</td>
                <td className="table-td text-gray-500">{new Date(l.AssignedAt).toLocaleDateString()}</td>
                <td className="table-td">
                  <button onClick={() => handleDelete(l.PromoVehicleID)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={closeModal} title="Assign Vehicle to Promotion">
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="label">Promotion (Active only) *</label>
            <select name="PromotionID" value={form.PromotionID} onChange={handleChange}
              className={`input-field ${errors.PromotionID ? 'border-red-500' : ''}`}>
              <option value="">— Select promotion —</option>
              {promos.map(p => <option key={p.PromotionID} value={p.PromotionID}>{p.Title}</option>)}
            </select>
            {errors.PromotionID && <p className="text-red-500 text-xs mt-1">{errors.PromotionID}</p>}
          </div>
          <div>
            <label className="label">Vehicle *</label>
            <select name="Plate_Number" value={form.Plate_Number} onChange={handleChange}
              className={`input-field ${errors.Plate_Number ? 'border-red-500' : ''}`}>
              <option value="">— Select vehicle —</option>
              {vehicles.map(v => (
                <option key={v.Plate_Number} value={v.Plate_Number}>
                  {v.Plate_Number} – {v.Brand} {v.Model} ({v.Status})
                </option>
              ))}
            </select>
            {errors.Plate_Number && <p className="text-red-500 text-xs mt-1">{errors.Plate_Number}</p>}
          </div>
          <div>
            <label className="label">Performance (optional)</label>
            <input name="Performance" value={form.Performance} onChange={handleChange}
              className="input-field" placeholder="e.g. High demand, top performer" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Assign'}
            </button>
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
