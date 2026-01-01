import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, TrendingDown, Users, X } from 'lucide-react';

const formatIndianNumber = (num: number | string): string => {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';

  const [integer, decimal] = n.toFixed(2).split('.');
  const lastThree = integer.slice(-3);
  const otherNumbers = integer.slice(0, -3);
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + (otherNumbers ? ',' : '') + lastThree;

  return decimal && parseFloat(decimal) > 0 ? `${formatted}.${decimal}` : formatted;
};

interface AdjustmentRecord {
  date: string;
  advance_adjustment: number;
  meeting_count: number;
  original_amount: number;
  amount: number;
}

interface AdvanceAdjustmentHistoryProps {
  clientName: string;
  isDark: boolean;
  onClose: () => void;
}

export function AdvanceAdjustmentHistory({ clientName, isDark, onClose }: AdvanceAdjustmentHistoryProps) {
  const [adjustments, setAdjustments] = useState<AdjustmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAdjusted, setTotalAdjusted] = useState(0);

  useEffect(() => {
    fetchAdjustments();
  }, [clientName]);

  const fetchAdjustments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('daily_dues')
      .select('date, advance_adjustment, meeting_count, original_amount, amount')
      .eq('client_name', clientName)
      .gt('advance_adjustment', 0)
      .order('date', { ascending: false });

    if (!error && data) {
      setAdjustments(data);
      const total = data.reduce((sum, adj) => sum + Number(adj.advance_adjustment), 0);
      setTotalAdjusted(total);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-2xl p-6 ${
          isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Advance Adjustment History
            </h2>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Client: <span className="font-semibold text-purple-500">{clientName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-all ${
              isDark ? 'hover:bg-slate-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : adjustments.length === 0 ? (
          <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            <TrendingDown size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold">No advance adjustments found</p>
            <p className="text-sm mt-2">This client hasn't used any advance payment yet.</p>
          </div>
        ) : (
          <>
            <div className={`p-5 rounded-xl mb-6 border ${
              isDark
                ? 'bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30'
                : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200'
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <TrendingDown className={isDark ? 'text-purple-400' : 'text-purple-600'} size={24} />
                <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Advance Used Till Date
                </span>
              </div>
              <p className={`text-3xl font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                {'\u20B9'}{formatIndianNumber(totalAdjusted)}
              </p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Across {adjustments.length} day{adjustments.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="space-y-3">
              <h3 className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Day-wise Breakdown
              </h3>
              {adjustments.map((adj, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border ${
                    isDark
                      ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  } transition-all`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className={isDark ? 'text-purple-400' : 'text-purple-600'} />
                      <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {new Date(adj.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={16} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {adj.meeting_count} meeting{adj.meeting_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        Original Due
                      </p>
                      <p className={`font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {'\u20B9'}{formatIndianNumber(adj.original_amount || adj.advance_adjustment + adj.amount)}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        Advance Adjusted
                      </p>
                      <p className={`font-bold text-purple-500`}>
                        -{'\u20B9'}{formatIndianNumber(adj.advance_adjustment)}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        Net Due
                      </p>
                      <p className={`font-bold ${
                        adj.amount > 0
                          ? isDark ? 'text-red-400' : 'text-red-600'
                          : isDark ? 'text-green-400' : 'text-green-600'
                      }`}>
                        {'\u20B9'}{formatIndianNumber(adj.amount)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
