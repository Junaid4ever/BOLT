import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Shield, Check, X, UserPlus, Key, AlertCircle, Wallet, TrendingDown, History } from 'lucide-react';

const formatIndianNumber = (num: number | string): string => {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';
  const [integer, decimal] = n.toFixed(2).split('.');
  const lastThree = integer.slice(-3);
  const otherNumbers = integer.slice(0, -3);
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + (otherNumbers ? ',' : '') + lastThree;
  return decimal && parseFloat(decimal) > 0 ? `${formatted}.${decimal}` : formatted;
};

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_cohost: boolean;
  cohost_prefix: string | null;
  parent_user_id: string | null;
  created_at: string;
}

interface CohostAdvanceInfo {
  cohostId: string;
  cohostName: string;
  advanceBalance: number;
  totalUsed: number;
  adjustmentCount: number;
}

interface CoHostRequest {
  id: string;
  user_id: string;
  requested_at: string;
  status: string;
  users: {
    name: string;
    email: string;
  };
}

interface CoHostManagementProps {
  onClose: () => void;
}

export function CoHostManagement({ onClose }: CoHostManagementProps) {
  const [clients, setClients] = useState<User[]>([]);
  const [cohosts, setCohosts] = useState<User[]>([]);
  const [requests, setRequests] = useState<CoHostRequest[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [cohostPrefix, setCohostPrefix] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [advanceInfo, setAdvanceInfo] = useState<Map<string, CohostAdvanceInfo>>(new Map());
  const [expandedCohost, setExpandedCohost] = useState<string | null>(null);
  const [cohostAdjustments, setCohostAdjustments] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'client')
        .order('name');

      if (clientsError) {
        console.error('Error fetching clients:', clientsError);
      } else if (clientsData) {
        const nonCohostClients = clientsData.filter(c => !c.is_cohost);
        setClients(nonCohostClients);
      }

      const { data: cohostsData, error: cohostsError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'client')
        .order('name');

      if (cohostsError) {
        console.error('Error fetching cohosts:', cohostsError);
      } else if (cohostsData) {
        const cohostUsers = cohostsData.filter(c => c.is_cohost === true);
        setCohosts(cohostUsers);
      }

      const { data: requestsData, error: requestsError } = await supabase
        .from('cohost_requests')
        .select('*, users(name, email)')
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (requestsError) {
        console.error('Error fetching requests:', requestsError);
      } else if (requestsData) {
        setRequests(requestsData as any);
      }

      if (cohostsData) {
        const cohostUsers = cohostsData.filter(c => c.is_cohost === true);
        await fetchAdvanceInfo(cohostUsers);
      }
    } catch (error) {
      console.error('Error in fetchData:', error);
    }
  };

  const fetchAdvanceInfo = async (cohostList: User[]) => {
    const infoMap = new Map<string, CohostAdvanceInfo>();

    for (const cohost of cohostList) {
      const { data: advanceData } = await supabase
        .from('advance_payments')
        .select('remaining_amount, advance_amount')
        .eq('client_name', cohost.name)
        .eq('is_active', true)
        .maybeSingle();

      let totalUsed = 0;
      let adjustmentCount = 0;

      try {
        const { data: adjustments } = await supabase
          .from('advance_adjustments')
          .select('adjusted_amount')
          .eq('cohost_id', cohost.id);

        if (adjustments && adjustments.length > 0) {
          totalUsed = adjustments.reduce((sum, adj) => sum + Number(adj.adjusted_amount), 0);
          adjustmentCount = adjustments.length;
        }
      } catch {
        totalUsed = Number(advanceData?.advance_amount || 0) - Number(advanceData?.remaining_amount || 0);
      }

      infoMap.set(cohost.id, {
        cohostId: cohost.id,
        cohostName: cohost.name,
        advanceBalance: Number(advanceData?.remaining_amount) || 0,
        totalUsed,
        adjustmentCount
      });
    }

    setAdvanceInfo(infoMap);
  };

  const fetchCohostAdjustments = async (cohostId: string) => {
    try {
      const { data } = await supabase
        .from('advance_adjustments')
        .select('*')
        .eq('cohost_id', cohostId)
        .order('created_at', { ascending: false })
        .limit(20);

      setCohostAdjustments(data || []);
    } catch {
      setCohostAdjustments([]);
    }
  };

  const handlePromoteToCohost = async () => {
    if (!selectedClientId || !cohostPrefix) {
      alert('Please select a client and enter a prefix');
      return;
    }

    if (cohostPrefix.length < 1 || cohostPrefix.length > 5 || !/^[A-Z]+$/.test(cohostPrefix.toUpperCase())) {
      alert('Prefix must be 1-5 letters (A-Z)');
      return;
    }

    const { data: existingPrefix } = await supabase
      .from('users')
      .select('id')
      .eq('cohost_prefix', cohostPrefix.toUpperCase())
      .maybeSingle();

    if (existingPrefix) {
      alert('This prefix is already taken. Please choose another.');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('users')
      .update({
        is_cohost: true,
        cohost_prefix: cohostPrefix.toUpperCase(),
        role: 'client'
      })
      .eq('id', selectedClientId);

    if (error) {
      alert('Error promoting to co-host: ' + error.message);
    } else {
      alert('Client promoted to Co-Host successfully!');
      setSelectedClientId('');
      setCohostPrefix('');
      fetchData();
    }

    setLoading(false);
  };

  const handleApproveRequest = async (requestId: string, userId: string) => {
    const prefix = prompt('Enter a prefix for this co-host (1-5 letters, e.g., AJ, VN):');

    if (!prefix || prefix.length < 1 || prefix.length > 5 || !/^[A-Z]+$/i.test(prefix)) {
      alert('Invalid prefix. Please enter 1-5 letters (A-Z).');
      return;
    }

    const { data: existingPrefix } = await supabase
      .from('users')
      .select('id')
      .eq('cohost_prefix', prefix.toUpperCase())
      .maybeSingle();

    if (existingPrefix) {
      alert('This prefix is already taken.');
      return;
    }

    setLoading(true);

    await supabase
      .from('users')
      .update({
        is_cohost: true,
        cohost_prefix: prefix.toUpperCase()
      })
      .eq('id', userId);

    await supabase
      .from('cohost_requests')
      .update({
        status: 'approved',
        admin_response_at: new Date().toISOString(),
        admin_response_by: 'Admin'
      })
      .eq('id', requestId);

    alert('Co-Host request approved!');
    fetchData();
    setLoading(false);
  };

  const handleRejectRequest = async (requestId: string) => {
    setLoading(true);

    await supabase
      .from('cohost_requests')
      .update({
        status: 'rejected',
        admin_response_at: new Date().toISOString(),
        admin_response_by: 'Admin'
      })
      .eq('id', requestId);

    alert('Request rejected');
    fetchData();
    setLoading(false);
  };

  const handleRemoveCohost = async (userId: string) => {
    if (!confirm('Remove co-host status? Their sub-clients will remain.')) return;

    setLoading(true);

    await supabase
      .from('users')
      .update({
        is_cohost: false,
        cohost_prefix: null
      })
      .eq('id', userId);

    alert('Co-Host removed');
    fetchData();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Co-Host Management</h2>
              <p className="text-blue-100 text-sm">Manage co-hosts and their permissions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {requests.length > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
                <h3 className="text-xl font-bold text-yellow-900">Pending Requests ({requests.length})</h3>
              </div>
              <div className="space-y-3">
                {requests.map((request) => (
                  <div key={request.id} className="bg-white rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900">{request.users.name}</p>
                      <p className="text-sm text-gray-600">{request.users.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(request.requested_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveRequest(request.id, request.user_id)}
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
                      >
                        <Check size={16} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.id)}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
                      >
                        <X size={16} />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <UserPlus className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-bold text-blue-900">Promote Client to Co-Host</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Client
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 outline-none"
                >
                  <option value="">-- Select a client --</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Key className="inline w-4 h-4 mr-1" />
                  Co-Host Prefix (2-5 Letters)
                </label>
                <input
                  type="text"
                  value={cohostPrefix}
                  onChange={(e) => setCohostPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5))}
                  placeholder="e.g., AJ, VN, RX"
                  maxLength={5}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 outline-none uppercase"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Sub-clients will use this prefix to signup (e.g., AJ_ClientName)
                </p>
              </div>
              <button
                onClick={handlePromoteToCohost}
                disabled={loading || !selectedClientId || !cohostPrefix}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Promote to Co-Host'}
              </button>
            </div>
          </div>

          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-gray-700" />
              <h3 className="text-xl font-bold text-gray-900">Current Co-Hosts ({cohosts.length})</h3>
            </div>
            {cohosts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No co-hosts yet</p>
            ) : (
              <div className="space-y-4">
                {cohosts.map((cohost) => {
                  const info = advanceInfo.get(cohost.id);
                  const isExpanded = expandedCohost === cohost.id;

                  return (
                    <div key={cohost.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl overflow-hidden">
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                            <span className="text-white font-black text-xl">{cohost.cohost_prefix}</span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 flex items-center gap-2">
                              {cohost.name}
                              <Shield className="w-4 h-4 text-blue-600" />
                            </p>
                            <p className="text-sm text-gray-600">{cohost.email}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Prefix: <span className="font-bold text-blue-600">{cohost.cohost_prefix}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {info && (info.advanceBalance > 0 || info.totalUsed > 0) && (
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <Wallet size={12} />
                                  Advance Balance
                                </p>
                                <p className="font-bold text-teal-600">{'\u20B9'}{formatIndianNumber(info.advanceBalance)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <TrendingDown size={12} />
                                  Used ({info.adjustmentCount})
                                </p>
                                <p className="font-bold text-orange-600">{'\u20B9'}{formatIndianNumber(info.totalUsed)}</p>
                              </div>
                              <button
                                onClick={() => {
                                  if (isExpanded) {
                                    setExpandedCohost(null);
                                  } else {
                                    setExpandedCohost(cohost.id);
                                    fetchCohostAdjustments(cohost.id);
                                  }
                                }}
                                className="px-3 py-2 bg-teal-100 hover:bg-teal-200 text-teal-700 rounded-lg text-sm font-semibold transition-all flex items-center gap-1"
                              >
                                <History size={14} />
                                History
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => handleRemoveCohost(cohost.id)}
                            disabled={loading}
                            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-semibold transition-all disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {isExpanded && cohostAdjustments.length > 0 && (
                        <div className="border-t-2 border-blue-200 bg-white p-4">
                          <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                            <History size={16} />
                            Advance Adjustment History (Last 20)
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-gray-500 text-xs">
                                  <th className="text-left py-2 px-2">Date</th>
                                  <th className="text-left py-2 px-2">Meeting</th>
                                  <th className="text-left py-2 px-2">Sub-Client</th>
                                  <th className="text-right py-2 px-2">Members</th>
                                  <th className="text-right py-2 px-2">Adjusted</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cohostAdjustments.map((adj: any) => (
                                  <tr key={adj.id} className="border-t border-gray-100">
                                    <td className="py-2 px-2 text-gray-700">
                                      {new Date(adj.meeting_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </td>
                                    <td className="py-2 px-2 text-gray-700">
                                      <span className="font-medium">{adj.meeting_name || adj.meeting_id.slice(0, 8)}</span>
                                    </td>
                                    <td className="py-2 px-2 text-gray-700">
                                      {adj.is_subclient_meeting ? adj.subclient_name : <span className="text-gray-400">Direct</span>}
                                    </td>
                                    <td className="py-2 px-2 text-right text-gray-700">{adj.member_count}</td>
                                    <td className="py-2 px-2 text-right font-bold text-teal-600">
                                      {'\u20B9'}{formatIndianNumber(adj.adjusted_amount)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {isExpanded && cohostAdjustments.length === 0 && (
                        <div className="border-t-2 border-blue-200 bg-white p-4 text-center text-gray-500">
                          No adjustments recorded yet
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
