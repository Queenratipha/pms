import React, { useEffect, useState } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';

const StatCard = ({ label, value, color, to, icon }) => (
  <Link to={to} className={`card flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer`}>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
      </svg>
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value ?? '…'}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </Link>
);

export default function Dashboard() {
  const [stats, setStats] = useState({});

  useEffect(() => {
    Promise.all([
      api.get('/vehicles'),
      api.get('/customers'),
      api.get('/promotions'),
      api.get('/promo-vehicles'),
    ]).then(([v, c, p, pv]) => {
      setStats({
        vehicles:    v.data.length,
        customers:   c.data.length,
        promotions:  p.data.length,
        promoLinks:  pv.data.length,
        activePromo: p.data.filter(x => x.Status === 'Active').length,
        activeVeh:   v.data.filter(x => x.Status === 'Available').length,
      });
    }).catch(() => {});
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 text-sm">SwiftWheels Enterprises – Huye City, Southern Province, Rwanda</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        <StatCard label="Total Vehicles"      value={stats.vehicles}   color="bg-blue-500"   to="/vehicles"       icon="M8 17a2 2 0 100 4 2 2 0 000-4zm8 0a2 2 0 100 4 2 2 0 000-4zM3 5h2l2.6 10.4a1 1 0 00.97.6H17a1 1 0 00.96-.73l1.95-6.75A1 1 0 0018.95 7H6.21" />
        <StatCard label="Available Vehicles"  value={stats.activeVeh}  color="bg-teal-500"   to="/vehicles"       icon="M5 13l4 4L19 7" />
        <StatCard label="Total Customers"     value={stats.customers}  color="bg-purple-500" to="/customers"      icon="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-5a4 4 0 11-8 0 4 4 0 018 0z" />
        <StatCard label="Total Promotions"    value={stats.promotions} color="bg-orange-500" to="/promotions"     icon="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        <StatCard label="Active Promotions"   value={stats.activePromo} color="bg-green-500"  to="/promotions"    icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        <StatCard label="Promo–Vehicle Links" value={stats.promoLinks} color="bg-pink-500"   to="/promo-vehicles" icon="M13 10V3L4 14h7v7l9-11h-7z" />
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-2">About PMS</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          The <strong>Promotion and Marketing Subsystem (PMS)</strong> helps SwiftWheels Enterprises manage
          vehicles, customers, and promotional campaigns in real time.
          Use the sidebar to navigate between modules. All changes are saved instantly to the database.
        </p>
      </div>
    </div>
  );
}
