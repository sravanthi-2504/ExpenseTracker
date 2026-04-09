import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, ArrowRightLeft, CreditCard, Search } from 'lucide-react';

export default function History() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setError(null);
      const { data } = await api.get('/transactions');
      setTransactions(data);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      setError(error.response?.data?.error || 'Failed to fetch transaction history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filteredTransactions = transactions.filter(t => 
    t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center text-gray-500">Loading history...</div>;

  if (error) return (
    <div className="p-8 text-center">
      <div className="max-w-md mx-auto p-6 bg-red-50 border border-red-100 rounded-2xl">
        <p className="text-red-600 font-medium mb-4">{error}</p>
        <button 
          onClick={() => { setLoading(true); fetchTransactions(); }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm font-medium uppercase tracking-wider">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransactions.map((t, i) => (
                <motion.tr 
                  key={t.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {t.type === 'income' ? <TrendingUp className="text-green-600" size={16} /> : 
                       t.type === 'expense' ? <TrendingDown className="text-red-600" size={16} /> : 
                       <ArrowRightLeft className="text-blue-600" size={16} />}
                      <span className={`text-sm font-medium capitalize ${
                        t.type === 'income' ? 'text-green-600' : 
                        t.type === 'expense' ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {t.type}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{t.category || 'Transfer'}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-900">{t.description}</span>
                      {t.is_credit_card === 1 && (
                        <span className="text-xs text-blue-600 flex items-center gap-1">
                          <CreditCard size={12} /> Credit Card
                        </span>
                      )}
                      {t.type === 'transfer' && (
                        <span className="text-xs text-gray-500">
                          {t.from_account} → {t.to_account}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-right font-bold ${
                    t.type === 'income' ? 'text-green-600' : 
                    t.type === 'expense' ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {t.type === 'expense' ? '-' : t.type === 'income' ? '+' : ''}₹{t.amount.toLocaleString()}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredTransactions.length === 0 && (
          <div className="p-12 text-center text-gray-500">No transactions found.</div>
        )}
      </div>
    </div>
  );
}
