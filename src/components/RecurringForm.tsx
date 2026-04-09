import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, CreditCard, Calendar, Trash2, Plus } from 'lucide-react';

interface RecurringExpense {
  id: number;
  amount: number;
  category: string;
  description: string;
  day_of_month: number;
  is_credit_card: number;
}

interface RecurringFormProps {
  onSuccess: () => void;
}

export default function RecurringForm({ onSuccess }: RecurringFormProps) {
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [isCreditCard, setIsCreditCard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecurring = async () => {
    try {
      const { data } = await api.get('/recurring');
      setRecurringExpenses(data);
    } catch (error) {
      console.error('Error fetching recurring expenses:', error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchRecurring();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/recurring', {
        amount: parseFloat(amount),
        category,
        description,
        day_of_month: parseInt(dayOfMonth),
        is_credit_card: isCreditCard,
      });
      setAmount('');
      setCategory('');
      setDescription('');
      setDayOfMonth('1');
      setIsCreditCard(false);
      fetchRecurring();
      onSuccess();
    } catch (error: any) {
      console.error('Error adding recurring expense:', error);
      setError(error.response?.data?.error || 'Failed to add recurring expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/recurring/${id}`);
      setRecurringExpenses(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting recurring expense:', error);
    }
  };

  const categories = ['Rent', 'Utilities', 'Insurance', 'Subscription', 'Mobile Recharge', 'Internet', 'Other'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit"
        >
          <div className="flex items-center gap-2 mb-6 text-blue-600">
            <Plus size={24} />
            <h2 className="text-xl font-bold text-gray-900">Add Fixed Expense</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Calendar size={14} /> Day of Month
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="1-31"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. WiFi Bill"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isCreditCard}
                onChange={(e) => setIsCreditCard(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 flex items-center gap-1">
                <CreditCard size={16} /> Pay via Credit Card
              </span>
            </label>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Adding...' : (
                <>
                  <RefreshCw size={20} />
                  Set Recurring Expense
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* List Section */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-2 mb-6 text-blue-600">
            <RefreshCw size={24} />
            <h2 className="text-xl font-bold text-gray-900">Saved Fixed Expenses</h2>
          </div>

          {fetching ? (
            <div className="text-center py-8 text-gray-500">Loading saved expenses...</div>
          ) : recurringExpenses.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
              <p className="text-gray-500">No fixed expenses saved yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {recurringExpenses.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-blue-100 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{item.description}</h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{item.category}</span>
                          <span>•</span>
                          <span>Day {item.day_of_month}</span>
                          {item.is_credit_card === 1 && (
                            <>
                              <span>•</span>
                              <span className="text-blue-600 flex items-center gap-0.5">
                                <CreditCard size={10} /> Credit Card
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-gray-900">₹{item.amount.toLocaleString()}</span>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
