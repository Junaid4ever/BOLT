import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, DollarSign, Users, Calendar, AlertCircle, ChevronDown, ChevronUp, User, UsersRound } from 'lucide-react';

interface SubClientDues {
  clientId: string;
  clientName: string;
  totalDues: number;
  totalMembers: number;
  meetingsCount: number;
  rate: number;
}

interface CohostProfitStackProps {
  cohostId: string;
  cohostName: string;
  cohostRate: number;
}

export function CohostProfitStack({ cohostId, cohostName, cohostRate }: CohostProfitStackProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [subClientDues, setSubClientDues] = useState<SubClientDues[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMembers, setTotalMembers] = useState(0);
  const [selfMeetings, setSelfMeetings] = useState(0);
  const [selfMembers, setSelfMembers] = useState(0);
  const [selfDues, setSelfDues] = useState(0);
  const [showDueBreakdown, setShowDueBreakdown] = useState(false);

  const fetchProfitData = async () => {
    setLoading(true);
    try {
      const { data: cohostData } = await supabase
        .from('users')
        .select('price_per_member')
        .eq('id', cohostId)
        .maybeSingle();

      const cohostOwnRate = Number(cohostData?.price_per_member) || cohostRate;

      const { data: selfMeetingsData, error: selfError } = await supabase
        .from('meetings')
        .select('member_count')
        .eq('client_id', cohostId)
        .eq('scheduled_date', selectedDate)
        .neq('screenshot_url', '');

      if (!selfError && selfMeetingsData) {
        const selfMemberCount = selfMeetingsData.reduce((sum, m) => sum + (m.member_count || 0), 0);
        setSelfMeetings(selfMeetingsData.length);
        setSelfMembers(selfMemberCount);
        setSelfDues(selfMemberCount * cohostRate);
      } else {
        setSelfMeetings(0);
        setSelfMembers(0);
        setSelfDues(0);
      }

      const { data: subClients, error: subClientsError } = await supabase
        .from('users')
        .select('id, name, price_per_member')
        .eq('parent_user_id', cohostId);

      if (subClientsError) throw subClientsError;

      if (!subClients || subClients.length === 0) {
        setSubClientDues([]);
        setTotalMembers(0);
        setLoading(false);
        return;
      }

      const duesData: SubClientDues[] = [];
      let allTotalMembers = 0;

      for (const client of subClients) {
        const { data: meetings, error: meetingsError } = await supabase
          .from('meetings')
          .select('member_count')
          .eq('client_id', client.id)
          .eq('scheduled_date', selectedDate)
          .neq('screenshot_url', '');

        if (meetingsError) {
          console.error('Error fetching meetings for client:', client.id, meetingsError);
          continue;
        }

        const clientMeetings = meetings || [];
        const clientTotalMembers = clientMeetings.reduce((sum, m) => sum + (m.member_count || 0), 0);
        const clientRate = Number(client.price_per_member) || 0;
        const clientTotalDues = clientTotalMembers * clientRate;

        allTotalMembers += clientTotalMembers;

        if (clientMeetings.length > 0 || clientTotalMembers > 0) {
          duesData.push({
            clientId: client.id,
            clientName: client.name,
            totalDues: clientTotalDues,
            totalMembers: clientTotalMembers,
            meetingsCount: clientMeetings.length,
            rate: clientRate
          });
        }
      }

      setSubClientDues(duesData);
      setTotalMembers(allTotalMembers);
    } catch (error) {
      console.error('Error fetching profit data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfitData();
  }, [selectedDate, cohostId]);

  useEffect(() => {
    const subscription = supabase
      .channel(`cohost_profit_${cohostId}_${selectedDate}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => {
        fetchProfitData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedDate, cohostId]);

  const totalRevenue = subClientDues.reduce((sum, client) => sum + client.totalDues, 0);
  const subClientCost = totalMembers * cohostRate;
  const totalCost = subClientCost + selfDues;
  const totalProfit = totalRevenue - subClientCost;
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';
  const totalMeetings = subClientDues.reduce((sum, client) => sum + client.meetingsCount, 0);
  const allMeetings = totalMeetings + selfMeetings;

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500 rounded-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Daily Profit Stack
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your earnings breakdown
            </p>
          </div>
        </div>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Revenue</span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            Rs.{totalRevenue.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            From sub-clients dues
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Cost</span>
            <DollarSign className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            Rs.{subClientCost.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {totalMembers} sub-client members x Rs.{cohostRate}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Net Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            Rs.{totalProfit.toFixed(2)}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            {profitMargin}% margin
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Meetings</span>
            <Calendar className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {allMeetings}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Completed today
          </div>
        </div>
      </div>

      <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl border-2 border-orange-200 dark:border-orange-700">
        <button
          onClick={() => setShowDueBreakdown(!showDueBreakdown)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-lg">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Net Due Today (to Admin)
              </h4>
              <p className="text-2xl font-black text-orange-600 dark:text-orange-400">
                Rs.{totalCost.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              View Breakdown
            </span>
            {showDueBreakdown ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>
        </button>

        {showDueBreakdown && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                  SELF (My Meetings)
                </span>
              </div>
              <p className="text-xl font-black text-blue-600 dark:text-blue-400">
                Rs.{selfDues.toFixed(2)}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {selfMeetings} meeting{selfMeetings !== 1 ? 's' : ''} | {selfMembers} member{selfMembers !== 1 ? 's' : ''} x Rs.{cohostRate}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700">
              <div className="flex items-center gap-2 mb-2">
                <UsersRound className="w-4 h-4 text-teal-500" />
                <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                  SUB-CLIENTS
                </span>
              </div>
              <p className="text-xl font-black text-teal-600 dark:text-teal-400">
                Rs.{subClientCost.toFixed(2)}
              </p>
              <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                {totalMeetings} meeting{totalMeetings !== 1 ? 's' : ''} | {totalMembers} member{totalMembers !== 1 ? 's' : ''} x Rs.{cohostRate}
              </p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Loading profit data...
        </div>
      ) : subClientDues.length === 0 && selfMeetings === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No completed meetings for {selectedDate}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                    Source
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                    Meetings
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                    Members
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                    Client Rate
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-blue-600 dark:text-blue-400">
                    Client Dues
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-red-600 dark:text-red-400">
                    Your Cost
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Your Profit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {selfMeetings > 0 && (
                  <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                    <td className="px-4 py-3 text-sm font-medium text-blue-700 dark:text-blue-300">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Self (My Meetings)
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                      {selfMeetings}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                      <div className="flex items-center justify-end gap-1">
                        <Users className="w-3 h-3" />
                        {selfMembers}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-500">
                      -
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-500">
                      -
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-red-600 dark:text-red-400">
                      Rs.{selfDues.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-500">
                      -
                    </td>
                  </tr>
                )}
                {subClientDues.map((client) => {
                  const clientCost = client.totalMembers * cohostRate;
                  const clientProfit = client.totalDues - clientCost;

                  return (
                    <tr key={client.clientId} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <UsersRound className="w-4 h-4 text-teal-500" />
                          {client.clientName}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                        {client.meetingsCount}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                        <div className="flex items-center justify-end gap-1">
                          <Users className="w-3 h-3" />
                          {client.totalMembers}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                        Rs.{client.rate.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-blue-600 dark:text-blue-400">
                        Rs.{client.totalDues.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-red-600 dark:text-red-400">
                        Rs.{clientCost.toFixed(2)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-bold ${clientProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        Rs.{clientProfit.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-emerald-50 dark:bg-emerald-900/20 border-t-2 border-emerald-300 dark:border-emerald-700">
                <tr>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">
                    TOTAL
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-gray-900 dark:text-white">
                    {allMeetings}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-gray-900 dark:text-white">
                    {totalMembers + selfMembers}
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-blue-600 dark:text-blue-400">
                    Rs.{totalRevenue.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-red-600 dark:text-red-400">
                    Rs.{totalCost.toFixed(2)}
                  </td>
                  <td className={`px-4 py-3 text-lg text-right font-bold ${totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    Rs.{totalProfit.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <strong>How it works:</strong> Revenue = Total dues from sub-clients (members x their rate).
            Cost = Total members x Rs.{cohostRate.toFixed(2)} (admin rate). Profit = Revenue - Cost.
            Updates instantly when meetings are added or deleted.
          </div>
        </div>
      </div>
    </div>
  );
}
