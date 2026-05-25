import { useState, useEffect } from 'react';
import { useAuth, api } from '../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

interface BillingStats {
  draftCount: string; sentCount: string; paidCount: string;
  totalRevenue: string; avgDaysToPayment: string;
}
interface Driver {
  id: string; name: string; status: string;
  acceptanceRate: string; currentLoad: number; experienceDays: number;
}
interface Mission { id: string; status: string; createdAt: string; }

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444'];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [stats, setStats]     = useState<BillingStats | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);

  useEffect(() => {
    api.get('/billing/stats').then(r => setStats(r.data.data)).catch(console.error);
    api.get('/drivers').then(r => setDrivers(r.data.data)).catch(console.error);
    api.get('/missions').then(r => setMissions(r.data.data)).catch(console.error);
  }, []);

  // Build status distribution for pie chart
  const statusCounts = ['pending', 'assigned', 'in_progress', 'completed', 'failed'].map(s => ({
    name: s.replace('_', ' '),
    value: missions.filter(m => m.status === s).length,
  })).filter(s => s.value > 0);

  // Driver performance sorted by acceptance rate
  const sortedDrivers = [...drivers].sort(
    (a, b) => parseFloat(b.acceptanceRate) - parseFloat(a.acceptanceRate)
  );

  // Revenue KPI cards
  const kpis = [
    { label: 'Total Revenue', value: stats ? `${parseFloat(stats.totalRevenue).toLocaleString()} DZD` : '—', icon: '💰', color: 'bg-green-50 text-green-700' },
    { label: 'Paid Invoices', value: stats?.paidCount ?? '—', icon: '✅', color: 'bg-blue-50 text-blue-700' },
    { label: 'Pending Payment', value: stats ? String(parseInt(stats.draftCount) + parseInt(stats.sentCount)) : '—', icon: '⏳', color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Avg Days to Pay', value: stats ? `${parseFloat(stats.avgDaysToPayment).toFixed(1)} days` : '—', icon: '📅', color: 'bg-indigo-50 text-indigo-700' },
    { label: 'Total Missions', value: String(missions.length), icon: '📋', color: 'bg-purple-50 text-purple-700' },
    { label: 'Active Drivers', value: String(drivers.filter(d => d.status === 'available').length), icon: '🚚', color: 'bg-emerald-50 text-emerald-700' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-xl text-gray-800">Management Dashboard</h1>
          <p className="text-sm text-gray-500">{user?.name}</p>
        </div>
        <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-700">Sign out</button>
      </header>

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map(kpi => (
            <div key={kpi.label} className={`rounded-2xl p-4 ${kpi.color}`}>
              <div className="text-2xl mb-1">{kpi.icon}</div>
              <div className="font-bold text-lg">{kpi.value}</div>
              <div className="text-xs opacity-70">{kpi.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mission status pie chart */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4">Mission Status Distribution</h2>
            {statusCounts.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {statusCounts.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-center py-12">No mission data</p>}
          </div>

          {/* Invoice status bar chart */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4">Invoice Pipeline</h2>
            {stats ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[
                  { name: 'Draft', count: parseInt(stats.draftCount) },
                  { name: 'Sent',  count: parseInt(stats.sentCount)  },
                  { name: 'Paid',  count: parseInt(stats.paidCount)  },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-center py-12">Loading…</p>}
          </div>
        </div>

        {/* Driver Performance Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-800">Driver Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Driver', 'Status', 'Acceptance Rate', 'Current Load', 'Experience'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedDrivers.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{d.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${d.status === 'available'   ? 'bg-green-100 text-green-700' :
                          d.status === 'on_mission'  ? 'bg-blue-100 text-blue-700'  :
                          'bg-gray-100 text-gray-600'}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className="bg-indigo-500 h-2 rounded-full"
                            style={{ width: `${parseFloat(d.acceptanceRate)}%` }} />
                        </div>
                        <span className="text-xs text-gray-600">{parseFloat(d.acceptanceRate).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{d.currentLoad} missions</td>
                    <td className="px-4 py-3 text-gray-600">{d.experienceDays} days</td>
                  </tr>
                ))}
                {sortedDrivers.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-8">No drivers found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
