import React, { useEffect, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Reports() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    api.get('/reports/customers-promotions')
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load report.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = data.filter(row =>
    !search ||
    row.CustomerName.toLowerCase().includes(search.toLowerCase()) ||
    row.Email.toLowerCase().includes(search.toLowerCase()) ||
    row.PromotionTitle.toLowerCase().includes(search.toLowerCase())
  );

  const toDate = (d) => d ? d.split('T')[0] : '';

  const handlePrint = () => window.print();

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Customer – Promotion Report</h2>
          <p className="text-sm text-gray-500">Active customers with currently active promotions</p>
        </div>
        <div className="flex gap-3">
          <input type="text" placeholder="Search customer or promotion…"
            value={search} onChange={e => setSearch(e.target.value)} className="input-field max-w-xs" />
          <button onClick={handlePrint} className="btn-secondary whitespace-nowrap print:hidden">
            🖨 Print
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-2xl font-bold text-blue-600">{new Set(data.map(r => r.CustomerID)).size}</p>
          <p className="text-xs text-gray-500 mt-1">Active Customers</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-600">{new Set(data.map(r => r.PromotionID)).size}</p>
          <p className="text-xs text-gray-500 mt-1">Active Promotions</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-purple-600">{data.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Matches</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-orange-600">{filtered.length}</p>
          <p className="text-xs text-gray-500 mt-1">Showing</p>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Customer','Email','Phone','Promo Title','Discount Type','Value','Start','End'].map(h => (
                <th key={h} className="table-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="table-td text-center py-8 text-gray-400">Loading report…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="table-td text-center py-8 text-gray-400">
                {data.length === 0 ? 'No active customers with active promotions found.' : 'No matches for your search.'}
              </td></tr>
            ) : filtered.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="table-td font-medium">{row.CustomerName}</td>
                <td className="table-td">{row.Email}</td>
                <td className="table-td">{row.PhoneNumber}</td>
                <td className="table-td font-medium text-blue-700">{row.PromotionTitle}</td>
                <td className="table-td">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700">
                    {row.Discount_Type}
                  </span>
                </td>
                <td className="table-td">
                  {row.Discount_Type === 'Free' ? '—' : Number(row.Discount_Value).toLocaleString()}
                </td>
                <td className="table-td text-gray-500">{toDate(row.Start_Date)}</td>
                <td className="table-td text-gray-500">{toDate(row.End_Date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
