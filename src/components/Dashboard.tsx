import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Wallet, ArrowRightLeft, CreditCard } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface Stats {
  current: { income: number; expense: number; savings: number; categories: { name: string; value: number }[] };
  previous: { income: number; expense: number; savings: number };
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setError(null);
      const { data } = await api.get('/stats');
      setStats(data);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      setError(error.response?.data?.error || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
  
  if (error) return (
    <div className="p-8 text-center">
      <div className="max-w-md mx-auto p-6 bg-red-50 border border-red-100 rounded-2xl">
        <p className="text-red-600 font-medium mb-4">{error}</p>
        <button 
          onClick={() => { setLoading(true); fetchStats(); }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  if (!stats) return <div className="p-8 text-center text-red-500">No data available.</div>;

  const chartData = [
    { name: 'Income', current: stats.current.income, previous: stats.previous.income },
    { name: 'Expense', current: stats.current.expense, previous: stats.previous.expense },
    { name: 'Savings', current: stats.current.savings, previous: stats.previous.savings },
  ];

  const StatCard = ({ title, value, prevValue, icon: Icon }: any) => {
    const diff = value - prevValue;
    const percent = prevValue === 0 ? 0 : (diff / prevValue) * 100;
    
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <div className="p-3 rounded-xl bg-gray-100">
            <Icon className="text-gray-600" size={24} />
          </div>
          <span className={`text-sm font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {diff >= 0 ? '+' : ''}{percent.toFixed(1)}% vs last month
          </span>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">₹{value.toLocaleString()}</h3>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-sm text-gray-500">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Income" 
          value={stats.current.income} 
          prevValue={stats.previous.income} 
          icon={TrendingUp} 
        />
        <StatCard 
          title="Total Expenses" 
          value={stats.current.expense} 
          prevValue={stats.previous.expense} 
          icon={TrendingDown} 
        />
        <StatCard 
          title="Total Savings" 
          value={stats.current.savings} 
          prevValue={stats.previous.savings} 
          icon={Wallet} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Comparison</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: any) => [`₹${value.toLocaleString()}`, '']}
                />
                <Bar dataKey="previous" name="Last Month" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="current" name="This Month" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Spending by Category</h3>
          <div className="h-80">
            {stats.current.categories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.current.categories}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.current.categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Amount']}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No spending data for this month
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
