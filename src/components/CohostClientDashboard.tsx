import { useState, useEffect, useRef } from 'react';
import { supabase, Meeting } from '../lib/supabase';
import { Users, TrendingUp, Key, CheckCircle, XCircle, Upload, X, Wallet, ArrowLeft, LogIn, CreditCard, Video, Clock, Calendar, DollarSign, UserPlus, Copy, ExternalLink, Trash2, AlertTriangle, History, ArrowDownRight, Eye, Search } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { ClientPanel } from './ClientPanel';

const formatIndianNumber = (num: number | string): string => {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';

  const [integer, decimal] = n.toFixed(2).split('.');
  const lastThree = integer.slice(-3);
  const otherNumbers = integer.slice(0, -3);
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + (otherNumbers ? ',' : '') + lastThree;

  return decimal && parseFloat(decimal) > 0 ? `${formatted}.${decimal}` : formatted;
};

interface ClientSummary {
  id: string;
  name: string;
  email: string;
  totalDues: number;
  totalPaidAmount: number;
  lastPaymentDate: string | null;
  unpaidDays: number;
  isBlocked: boolean;
  advanceAmount: number;
  pricePerMember: number;
  totalMeetings: number;
  totalMembers: number;
  totalCharged: number;
  totalAdminCost: number;
  netProfit: number;
  todayMembers: number;
  todayProfit: number;
}

interface ClientProfitBreakdown {
  clientName: string;
  clientId: string;
  todayMembers: number;
  todayProfit: number;
  totalMembers: number;
  totalProfit: number;
}

interface AdvanceAdjustment {
  id: string;
  advance_id: string;
  cohost_id: string;
  cohost_name: string;
  subclient_id: string | null;
  subclient_name: string | null;
  meeting_id: string;
  meeting_name: string | null;
  meeting_date: string;
  member_count: number;
  adjusted_amount: number;
  balance_before: number;
  balance_after: number;
  is_subclient_meeting: boolean;
  notes: string | null;
  created_at: string;
}

interface PendingPayment {
  id: string;
  client_id: string;
  client_name: string;
  amount: number;
  payment_date: string;
  screenshot_url: string;
  status: string;
  created_at: string;
}

interface CohostDashboardProps {
  cohostUserId: string;
  cohostName: string;
  cohostPrefix: string;
  onClose: () => void;
}

export function CohostClientDashboard({ cohostUserId, cohostName, cohostPrefix, onClose }: CohostDashboardProps) {
  const { isDark } = useTheme();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [clientPassword, setClientPassword] = useState('');
  const [totalNetReceivable, setTotalNetReceivable] = useState(0);
  const [showPaymentSettings, setShowPaymentSettings] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [usdtAddress, setUsdtAddress] = useState('');
  const [usdtNetwork, setUsdtNetwork] = useState('TRC20');
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [existingQrUrl, setExistingQrUrl] = useState('');
  const [uploadingQr, setUploadingQr] = useState(false);
  const [todayReceivable, setTodayReceivable] = useState(0);
  const [bep20Address, setBep20Address] = useState('');
  const [trc20Address, setTrc20Address] = useState('');
  const [viewingClientPanel, setViewingClientPanel] = useState(false);
  const [viewingClientData, setViewingClientData] = useState<any>(null);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => { selectedDateRef.current = selectedDate; }, [selectedDate]);

  useEffect(() => {
    fetchMeetings();
  }, [selectedDate]);

  const [showMeetings, setShowMeetings] = useState(true);
  const [adminRate, setAdminRate] = useState(1);
  const [cohostRate, setCohostRate] = useState(0);
  const [todayProfit, setTodayProfit] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [todayMembers, setTodayMembers] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const [showProfitBreakdown, setShowProfitBreakdown] = useState(false);
  const [dailyProfitData, setDailyProfitData] = useState<{date: string; members: number; profit: number}[]>([]);
  const [clientProfitBreakdown, setClientProfitBreakdown] = useState<ClientProfitBreakdown[]>([]);
  const [showDailyClientProfit, setShowDailyClientProfit] = useState(false);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [newClientRate, setNewClientRate] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);
  const [showClientCreatedModal, setShowClientCreatedModal] = useState(false);
  const [createdClientInfo, setCreatedClientInfo] = useState<{username: string; password: string} | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientSummary | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingClient, setDeletingClient] = useState(false);
  const [showAdvanceAdjustments, setShowAdvanceAdjustments] = useState(false);
  const [advanceAdjustments, setAdvanceAdjustments] = useState<AdvanceAdjustment[]>([]);
  const [cohostAdvanceBalance, setCohostAdvanceBalance] = useState(0);
  const [totalAdvanceUsed, setTotalAdvanceUsed] = useState(0);
  const [notifyClientsOnUpdate, setNotifyClientsOnUpdate] = useState(false);
  const [cohostOwnDues, setCohostOwnDues] = useState(0);
  const [cohostTotalPaid, setCohostTotalPaid] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [subClients, setSubClients] = useState<{id: string; name: string}[]>([]);

  useEffect(() => {
    fetchClientsData();
    fetchPaymentMethods();
    fetchPendingPayments();
    fetchSubClients();
    fetchMeetings();
    fetchProfitData();
    fetchAdvanceAdjustments();
    fetchCohostAdvance();
    fetchCohostOwnDues();

    const subscription = supabase
      .channel('cohost_clients_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_dues'
      }, () => {
        fetchClientsData();
        fetchCohostOwnDues();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments'
      }, () => {
        fetchClientsData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'meetings'
      }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          const meeting = payload.new as any;
          if (meeting.status === 'not_live' || meeting.status === 'wrong_credentials') return;
          const meetingDate = meeting.scheduled_date || new Date(meeting.created_at).toISOString().split('T')[0];
          if (meetingDate === selectedDateRef.current) {
            setMeetings(prev => {
              if (prev.some(m => m.id === meeting.id)) return prev;
              return [meeting, ...prev].sort((a, b) => {
                const hourA = (a.hour || 0) + (a.time_period === 'PM' && a.hour !== 12 ? 12 : 0);
                const hourB = (b.hour || 0) + (b.time_period === 'PM' && b.hour !== 12 ? 12 : 0);
                return hourA - hourB;
              });
            });
          }
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          const updated = payload.new as any;
          if (updated.status === 'not_live' || updated.status === 'wrong_credentials') {
            setMeetings(prev => prev.filter(m => m.id !== updated.id));
          } else {
            setMeetings(prev => prev.map(m => m.id === updated.id ? updated : m));
          }
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setMeetings(prev => prev.filter(m => m.id !== (payload.old as any).id));
        }
        fetchClientsData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payment_receiving'
      }, () => {
        fetchPendingPayments();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'advance_adjustments'
      }, () => {
        fetchAdvanceAdjustments();
        fetchCohostAdvance();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'advance_payments'
      }, () => {
        fetchAdvanceAdjustments();
        fetchCohostAdvance();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [cohostUserId]);

  const fetchAdvanceAdjustments = async () => {
    try {
      const { data, error } = await supabase
        .from('advance_adjustments')
        .select('*')
        .eq('cohost_id', cohostUserId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setAdvanceAdjustments(data);
        const totalUsed = data.reduce((sum, adj) => sum + Number(adj.adjusted_amount), 0);
        setTotalAdvanceUsed(totalUsed);
      }
    } catch {
      setAdvanceAdjustments([]);
    }
  };

  const fetchCohostAdvance = async () => {
    const { data: cohostUser } = await supabase
      .from('users')
      .select('name')
      .eq('id', cohostUserId)
      .maybeSingle();

    if (cohostUser?.name) {
      const { data } = await supabase
        .from('advance_payments')
        .select('remaining_amount')
        .eq('client_name', cohostUser.name)
        .eq('is_active', true)
        .maybeSingle();

      setCohostAdvanceBalance(Number(data?.remaining_amount) || 0);
    }
  };

  const fetchCohostOwnDues = async () => {
    const { data: cohostUser } = await supabase
      .from('users')
      .select('name, price_per_member, cohost_rate')
      .eq('id', cohostUserId)
      .maybeSingle();

    if (!cohostUser?.name) return;

    const cohostRate = Number(cohostUser.cohost_rate) || Number(cohostUser.price_per_member) || 1;

    const [meetingsResult, paymentsResult] = await Promise.all([
      supabase
        .from('meetings')
        .select('member_count, scheduled_date, created_at, screenshot_url')
        .eq('client_id', cohostUserId)
        .neq('screenshot_url', ''),
      supabase
        .from('payments')
        .select('amount, payment_upto_date')
        .eq('client_name', cohostUser.name)
        .eq('status', 'approved')
        .order('payment_upto_date', { ascending: false })
    ]);

    const lastPayment = paymentsResult.data?.[0];
    const lastPaymentDate = lastPayment?.payment_upto_date;
    const today = new Date().toISOString().split('T')[0];

    const meetingsByDate = new Map<string, number>();
    meetingsResult.data?.forEach(meeting => {
      const meetingDate = meeting.scheduled_date || (meeting.created_at ? meeting.created_at.split('T')[0] : today);
      const members = meeting.member_count || 0;
      meetingsByDate.set(meetingDate, (meetingsByDate.get(meetingDate) || 0) + members);
    });

    let totalDues = 0;
    meetingsByDate.forEach((members, date) => {
      if (!lastPaymentDate || date > lastPaymentDate) {
        totalDues += members * cohostRate;
      }
    });

    const totalPaid = paymentsResult.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    setCohostOwnDues(totalDues);
    setCohostTotalPaid(totalPaid);
  };

  const fetchPaymentMethods = async () => {
    const { data } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('cohost_user_id', cohostUserId)
      .maybeSingle();

    if (data) {
      setUpiId(data.upi_id || '');
      setBep20Address(data.usdt_bep20_address || '');
      setTrc20Address(data.usdt_trc20_address || '');
      setExistingQrUrl(data.qr_code_url || '');
    }
  };

  const fetchClientsData = async () => {
    setLoading(true);

    const { data: cohostData } = await supabase
      .from('users')
      .select('cohost_rate, price_per_member, admin_rate')
      .eq('id', cohostUserId)
      .maybeSingle();

    const defaultClientRate = cohostData?.cohost_rate || cohostData?.price_per_member || 2;
    const adminRateValue = cohostData?.admin_rate || 1;

    const { data: clientUsers } = await supabase
      .from('users')
      .select('id, name, email, password_hash, is_blocked, price_per_member')
      .eq('parent_user_id', cohostUserId)
      .eq('role', 'client')
      .not('name', 'like', '[DELETED]%')
      .order('name');

    if (!clientUsers || clientUsers.length === 0) {
      setClients([]);
      setLoading(false);
      return;
    }

    const clientNames = clientUsers.map(u => u.name);
    const clientIds = clientUsers.map(u => u.id);

    const { data: allSubclients } = await supabase
      .from('users')
      .select('id, name, parent_user_id')
      .in('parent_user_id', clientIds)
      .eq('role', 'client');

    const subclientIds = allSubclients?.map(s => s.id) || [];
    const subclientToParentMap = new Map<string, string>();
    allSubclients?.forEach(s => {
      subclientToParentMap.set(s.id, s.parent_user_id);
    });

    console.log('\n========== SUBCLIENT MAPPING ==========');
    console.log('Clients:', clientUsers.map(c => `${c.name} (${c.id})`));
    console.log('Subclients found:', allSubclients?.map(s => `${s.name} -> parent: ${clientUsers.find(c => c.id === s.parent_user_id)?.name || s.parent_user_id}`));
    console.log('Subclient IDs:', subclientIds);

    const [paymentsResult, advancesResult, meetingsResult, subclientMeetingsResult] = await Promise.all([
      supabase
        .from('payments')
        .select('client_id, client_name, amount, payment_upto_date, rejected_amount, advance_id')
        .in('client_id', clientIds)
        .eq('status', 'approved')
        .is('advance_id', null)
        .order('payment_upto_date', { ascending: false }),

      supabase
        .from('advance_payments')
        .select('client_name, remaining_amount, is_active')
        .in('client_name', clientNames)
        .eq('is_active', true),

      supabase
        .from('meetings')
        .select('client_id, client_name, member_count, scheduled_date, created_at, attended, screenshot_url')
        .in('client_id', clientIds)
        .not('screenshot_url', 'is', null)
        .neq('screenshot_url', ''),

      subclientIds.length > 0
        ? supabase
            .from('meetings')
            .select('client_id, client_name, member_count, scheduled_date, created_at, attended, screenshot_url')
            .in('client_id', subclientIds)
            .not('screenshot_url', 'is', null)
            .neq('screenshot_url', '')
        : Promise.resolve({ data: [], error: null })
    ]);

    console.log('\n========== MEETINGS DATA ==========');
    console.log('Direct meetings count:', meetingsResult.data?.length || 0);
    console.log('Subclient meetings count:', subclientMeetingsResult.data?.length || 0);
    console.log('Client IDs being searched:', clientIds);

    console.log('\n--- Direct Meetings ---');
    meetingsResult.data?.forEach((m, i) => {
      console.log(`  ${i + 1}. Client: ${m.client_name}, ID: ${m.client_id}, Members: ${m.member_count}, Date: ${m.scheduled_date}, Screenshot: ${m.screenshot_url ? 'YES' : 'NO'}`);
    });

    console.log('\n--- Subclient Meetings ---');
    subclientMeetingsResult.data?.forEach((m, i) => {
      console.log(`  ${i + 1}. Client: ${m.client_name}, Client ID: ${m.client_id}, CoHost ID: ${(m as any).cohost_id}, Members: ${m.member_count}, Date: ${m.scheduled_date}, Screenshot: ${m.screenshot_url ? 'YES' : 'NO'}`);
    });
    console.log('===================================\n');

    const paymentsByClient = new Map<string, { total: number; rejected: number; lastPayment: any }>();
    paymentsResult.data?.forEach(payment => {
      const existing = paymentsByClient.get(payment.client_id) || { total: 0, rejected: 0, lastPayment: null };
      existing.total += Number(payment.amount);
      existing.rejected += Number(payment.rejected_amount || 0);
      if (!existing.lastPayment) {
        existing.lastPayment = payment;
      }
      paymentsByClient.set(payment.client_id, existing);
    });

    const advancesByClient = new Map<string, number>();
    advancesResult.data?.forEach(advance => {
      advancesByClient.set(advance.client_name, Number(advance.remaining_amount) || 0);
    });

    const today = new Date().toISOString().split('T')[0];
    let totalReceivable = 0;
    let todayAmount = 0;
    const clientProfitMap = new Map<string, { todayMembers: number; todayProfit: number; totalMembers: number; totalProfit: number; totalMeetings: number }>();

    meetingsResult.data?.forEach(meeting => {
      if (!meeting.screenshot_url) return;

      const clientId = meeting.client_id;
      const members = meeting.member_count || 0;
      const meetingDate = meeting.scheduled_date || (meeting.created_at ? meeting.created_at.split('T')[0] : today);

      const clientUser = clientUsers.find(u => u.id === clientId);
      const clientRate = clientUser?.price_per_member || defaultClientRate;
      const profit = (clientRate - adminRateValue) * members;

      const existing = clientProfitMap.get(clientId) || { todayMembers: 0, todayProfit: 0, totalMembers: 0, totalProfit: 0, totalMeetings: 0 };
      existing.totalMembers += members;
      existing.totalProfit += profit;
      existing.totalMeetings += 1;

      if (meetingDate === today) {
        existing.todayMembers += members;
        existing.todayProfit += profit;
      }

      clientProfitMap.set(clientId, existing);
    });

    subclientMeetingsResult.data?.forEach(meeting => {
      if (!meeting.screenshot_url) return;

      const subclientId = meeting.client_id;
      const parentId = subclientToParentMap.get(subclientId);
      if (!parentId) return;

      const members = meeting.member_count || 0;
      const meetingDate = meeting.scheduled_date || (meeting.created_at ? meeting.created_at.split('T')[0] : today);

      const clientUser = clientUsers.find(u => u.id === parentId);
      const clientRate = clientUser?.price_per_member || defaultClientRate;
      const profit = (clientRate - adminRateValue) * members;

      const existing = clientProfitMap.get(parentId) || { todayMembers: 0, todayProfit: 0, totalMembers: 0, totalProfit: 0, totalMeetings: 0 };
      existing.totalMembers += members;
      existing.totalProfit += profit;
      existing.totalMeetings += 1;

      if (meetingDate === today) {
        existing.todayMembers += members;
        existing.todayProfit += profit;
      }

      clientProfitMap.set(parentId, existing);
    });

    const meetingsByClientDate = new Map<string, Map<string, number>>();

    console.log('\n========== PROCESSING DIRECT MEETINGS ==========');
    meetingsResult.data?.forEach(meeting => {
      if (!meeting.screenshot_url) return;
      const clientId = meeting.client_id;
      const members = meeting.member_count || 0;
      const meetingDate = meeting.scheduled_date || (meeting.created_at ? meeting.created_at.split('T')[0] : today);

      if (!meetingsByClientDate.has(clientId)) {
        meetingsByClientDate.set(clientId, new Map());
      }
      const clientDates = meetingsByClientDate.get(clientId)!;
      const prevMembers = clientDates.get(meetingDate) || 0;
      clientDates.set(meetingDate, prevMembers + members);
      console.log(`Client ${meeting.client_name}: Date ${meetingDate} - Added ${members} members (was ${prevMembers}, now ${prevMembers + members})`);
    });

    console.log('\n========== PROCESSING SUBCLIENT MEETINGS ==========');
    console.log('Using parent_user_id mapping approach');
    console.log('Subclient to Parent map:', Object.fromEntries(subclientToParentMap));

    subclientMeetingsResult.data?.forEach(meeting => {
      if (!meeting.screenshot_url) {
        console.log(`SKIPPED (no screenshot): ${meeting.client_name}`);
        return;
      }

      const subclientId = meeting.client_id;
      const parentId = subclientToParentMap.get(subclientId);
      const members = meeting.member_count || 0;
      const meetingDate = meeting.scheduled_date || (meeting.created_at ? meeting.created_at.split('T')[0] : today);

      console.log(`\nSubclient meeting: ${meeting.client_name} (ID: ${subclientId})`);
      console.log(`  Parent ID from map: ${parentId}`);
      const parentUser = clientUsers.find(u => u.id === parentId);
      console.log(`  Parent user: ${parentUser?.name || 'NOT FOUND'}`);
      console.log(`  Date: ${meetingDate}, Members: ${members}`);

      if (!parentId) {
        console.log(`  WARNING: No parent found for subclient ${meeting.client_name}!`);
        return;
      }

      if (!meetingsByClientDate.has(parentId)) {
        console.log(`  Creating new date map for parent: ${parentId}`);
        meetingsByClientDate.set(parentId, new Map());
      }
      const clientDates = meetingsByClientDate.get(parentId)!;
      const existingMembers = clientDates.get(meetingDate) || 0;
      clientDates.set(meetingDate, existingMembers + members);
      console.log(`  ADDED to ${parentUser?.name}: Date ${meetingDate} now has ${existingMembers + members} members (was ${existingMembers})`);
    });

    console.log('\n--- Final meetingsByClientDate Map ---');
    meetingsByClientDate.forEach((dates, clientId) => {
      const clientUser = clientUsers.find(u => u.id === clientId);
      console.log(`Client: ${clientUser?.name || 'UNKNOWN'} (ID: ${clientId})`);
      let totalMembers = 0;
      dates.forEach((members, date) => {
        console.log(`  ${date}: ${members} members`);
        totalMembers += members;
      });
      console.log(`  TOTAL: ${totalMembers} members across all dates`);
    });
    console.log('================================================\n');

    const clientsData: ClientSummary[] = clientUsers.map(user => {
      const payments = paymentsByClient.get(user.id) || { total: 0, rejected: 0, lastPayment: null };
      const lastPaymentDate = payments.lastPayment?.payment_upto_date;
      const clientRate = user.price_per_member || defaultClientRate;

      const clientMeetingDates = meetingsByClientDate.get(user.id) || new Map();
      let unpaidDuesTotal = 0;
      let todayDueAmount = 0;
      let unpaidDaysCount = 0;

      console.log(`\n========== CALCULATING DUES FOR ${user.name.toUpperCase()} ==========`);
      console.log('Client ID:', user.id);
      console.log('Client rate:', clientRate);
      console.log('Last payment date:', lastPaymentDate);
      console.log('\nMeeting dates breakdown:');
      if (clientMeetingDates.size === 0) {
        console.log('  NO MEETINGS FOUND for this client');
      } else {
        Array.from(clientMeetingDates.entries()).forEach(([date, members]) => {
          console.log(`  ${date}: ${members} members`);
        });
      }

      console.log('\nDue Calculation:');
      clientMeetingDates.forEach((members, date) => {
        const dueAmount = members * clientRate;
        const isPaid = lastPaymentDate && date <= lastPaymentDate;
        const isToday = date === today;
        console.log(`  ${date}: ${members} members × ₹${clientRate} = ₹${dueAmount} ${isPaid ? '(PAID)' : '(UNPAID)'} ${isToday ? '⭐ TODAY' : ''}`);

        if (!lastPaymentDate || date > lastPaymentDate) {
          unpaidDuesTotal += dueAmount;
          unpaidDaysCount++;
        }
        if (date === today) {
          todayDueAmount = dueAmount;
        }
      });

      const netDue = unpaidDuesTotal + payments.rejected;
      console.log(`\nSUMMARY:`);
      console.log(`  Unpaid dues: ₹${unpaidDuesTotal}`);
      console.log(`  Rejected payments: ₹${payments.rejected}`);
      console.log(`  Net Due Till Today: ₹${netDue}`);
      console.log(`  Today's Due: ₹${todayDueAmount}`);
      console.log('='.repeat(60) + '\n');
      todayAmount += todayDueAmount;
      totalReceivable += Math.max(0, netDue);

      const advanceAmount = advancesByClient.get(user.name) || 0;
      const profitData = clientProfitMap.get(user.id) || { todayMembers: 0, todayProfit: 0, totalMembers: 0, totalProfit: 0, totalMeetings: 0 };

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        totalDues: netDue,
        totalPaidAmount: payments.total,
        lastPaymentDate: lastPaymentDate || null,
        unpaidDays: unpaidDaysCount,
        isBlocked: user.is_blocked || false,
        advanceAmount,
        pricePerMember: clientRate,
        totalMeetings: profitData.totalMeetings,
        totalMembers: profitData.totalMembers,
        totalCharged: profitData.totalMembers * clientRate,
        totalAdminCost: profitData.totalMembers * adminRateValue,
        netProfit: profitData.totalProfit,
        todayMembers: profitData.todayMembers,
        todayProfit: profitData.todayProfit
      };
    });

    const profitBreakdown: ClientProfitBreakdown[] = clientsData.map(c => ({
      clientName: c.name,
      clientId: c.id,
      todayMembers: c.todayMembers,
      todayProfit: c.todayProfit,
      totalMembers: c.totalMembers,
      totalProfit: c.netProfit
    })).filter(c => c.totalMembers > 0);

    console.log('\n========== FINAL SUMMARY ==========');
    console.log('Total Net Receivable (all clients): ₹' + totalReceivable);
    console.log('Today\'s Total Receivable: ₹' + todayAmount);
    console.log('Number of clients with dues:', clientsData.length);
    console.log('===================================\n');

    setClientProfitBreakdown(profitBreakdown);
    setClients(clientsData.sort((a, b) => b.totalDues - a.totalDues));
    setTotalNetReceivable(totalReceivable);
    setTodayReceivable(todayAmount);
    setLoading(false);
  };

  const fetchProfitData = async () => {
    const { data: cohostData } = await supabase
      .from('users')
      .select('cohost_rate, price_per_member')
      .eq('id', cohostUserId)
      .maybeSingle();

    const clientRate = cohostData?.cohost_rate || cohostData?.price_per_member || 2;
    const adminRateValue = 1;
    setAdminRate(adminRateValue);
    setCohostRate(clientRate);

    const { data: clientUsers } = await supabase
      .from('users')
      .select('name')
      .eq('parent_user_id', cohostUserId)
      .eq('role', 'client')
      .not('name', 'like', '[DELETED]%');

    if (!clientUsers || clientUsers.length === 0) {
      setTodayProfit(0);
      setTotalProfit(0);
      return;
    }

    const clientNames = clientUsers.map(u => u.name);

    const { data: allMeetings } = await supabase
      .from('meetings')
      .select('member_count, scheduled_date, created_at, attended, client_name, screenshot_url')
      .in('client_name', clientNames)
      .eq('attended', true)
      .neq('screenshot_url', '');

    if (!allMeetings) {
      setTodayProfit(0);
      setTotalProfit(0);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    let todayMemberCount = 0;
    let allMemberCount = 0;
    const profitByDate = new Map<string, {members: number; profit: number}>();

    allMeetings.forEach(meeting => {
      const members = meeting.member_count || 0;
      const meetingDate = meeting.scheduled_date || meeting.created_at?.split('T')[0];

      allMemberCount += members;

      if (meetingDate === today) {
        todayMemberCount += members;
      }

      if (meetingDate) {
        const existing = profitByDate.get(meetingDate) || { members: 0, profit: 0 };
        existing.members += members;
        existing.profit += members * (clientRate - adminRateValue);
        profitByDate.set(meetingDate, existing);
      }
    });

    const profitPerMember = clientRate - adminRateValue;
    setTodayMembers(todayMemberCount);
    setTotalMembers(allMemberCount);
    setTodayProfit(todayMemberCount * profitPerMember);
    setTotalProfit(allMemberCount * profitPerMember);

    const sortedDailyProfit = Array.from(profitByDate.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.date.localeCompare(a.date));
    setDailyProfitData(sortedDailyProfit);
  };

  const handleViewPassword = async (client: ClientSummary) => {
    const { data } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', client.id)
      .single();

    if (data) {
      setClientPassword(data.password_hash);
      setSelectedClient(client);
      setShowPasswordModal(true);
    }
  };

  const handleLoginAsClient = async (client: ClientSummary) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', client.id)
      .single();

    if (data) {
      setViewingClientData(data);
      setViewingClientPanel(true);
    }
  };

  const toggleClientBlock = async (clientId: string, currentlyBlocked: boolean) => {
    const newBlockedState = !currentlyBlocked;

    const { error } = await supabase
      .from('users')
      .update({
        is_blocked: newBlockedState,
        login_enabled: !newBlockedState
      })
      .eq('id', clientId);

    if (error) {
      alert('Error updating client: ' + error.message);
      return;
    }

    await fetchClientsData();
    alert(newBlockedState ? 'Client blocked!' : 'Client unblocked!');
  };

  const fetchPendingPayments = async () => {
    const clientNames = clients.map(c => c.name);

    if (clientNames.length === 0) {
      const { data: clientUsers } = await supabase
        .from('users')
        .select('name')
        .eq('parent_user_id', cohostUserId)
        .eq('role', 'client')
        .not('name', 'like', '[DELETED]%');

      if (clientUsers && clientUsers.length > 0) {
        const names = clientUsers.map(u => u.name);
        const { data } = await supabase
          .from('payment_receiving')
          .select('*')
          .in('client_name', names)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (data) setPendingPayments(data);
      }
    } else {
      const { data } = await supabase
        .from('payment_receiving')
        .select('*')
        .in('client_name', clientNames)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (data) setPendingPayments(data);
    }
  };

  const approvePayment = async (payment: PendingPayment) => {
    const { error: insertError } = await supabase
      .from('payments')
      .insert({
        client_id: payment.client_id,
        client_name: payment.client_name,
        amount: payment.amount,
        payment_date: payment.payment_date,
        payment_upto_date: payment.payment_date,
        screenshot_url: payment.screenshot_url,
        status: 'approved'
      });

    if (insertError) {
      alert('Error approving payment: ' + insertError.message);
      return;
    }

    await supabase
      .from('payment_receiving')
      .update({ status: 'approved' })
      .eq('id', payment.id);

    await supabase
      .from('persistent_notifications')
      .insert({
        user_id: payment.client_id,
        type: 'payment_approved',
        title: 'Payment Approved',
        message: `Congratulations! Your last payment was settled and approved by ${cohostName}`,
        is_read: false
      });

    await fetchPendingPayments();
    await fetchClientsData();
    alert('Payment approved!');
  };

  const rejectPayment = async (payment: PendingPayment, reason: string) => {
    await supabase
      .from('payment_receiving')
      .update({ status: 'rejected' })
      .eq('id', payment.id);

    await supabase
      .from('due_adjustments')
      .insert({
        client_id: payment.client_id,
        client_name: payment.client_name,
        amount: payment.amount,
        reason: `Payment rejected by ${cohostName}: ${reason || 'Not specified'}`,
        date: new Date().toISOString().split('T')[0]
      });

    await supabase
      .from('persistent_notifications')
      .insert({
        user_id: payment.client_id,
        type: 'payment_rejected',
        title: 'Payment Rejected',
        message: `Your payment of Rs ${payment.amount} was rejected. Reason: ${reason || 'Not specified'}. The amount has been added back to your dues.`,
        is_read: false
      });

    setSelectedPayment(null);
    setRejectReason('');
    await fetchPendingPayments();
    await fetchClientsData();
    alert('Payment rejected! Dues restored to client.');
  };

  const fetchSubClients = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, name')
      .eq('parent_user_id', cohostUserId)
      .eq('role', 'client')
      .not('name', 'like', '[DELETED]%');

    if (data) {
      setSubClients(data);
    }
  };

  const fetchMeetings = async () => {
    const clientIds = clients.map(c => c.id);
    const startOfDay = `${selectedDate}T00:00:00`;
    const endOfDay = `${selectedDate}T23:59:59`;

    if (clientIds.length === 0) {
      const { data: clientUsers } = await supabase
        .from('users')
        .select('id')
        .eq('parent_user_id', cohostUserId)
        .eq('role', 'client')
        .not('name', 'like', '[DELETED]%');

      if (clientUsers && clientUsers.length > 0) {
        const ids = clientUsers.map(u => u.id);

        const [scheduledClientMeetings, instantClientMeetings] = await Promise.all([
          supabase
            .from('meetings')
            .select('*')
            .in('client_id', ids)
            .eq('scheduled_date', selectedDate)
            .neq('status', 'not_live')
            .neq('status', 'wrong_credentials'),
          supabase
            .from('meetings')
            .select('*')
            .in('client_id', ids)
            .is('scheduled_date', null)
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay)
            .neq('status', 'not_live')
            .neq('status', 'wrong_credentials')
        ]);

        const [scheduledCohostDirect, instantCohostDirect] = await Promise.all([
          supabase
            .from('meetings')
            .select('*')
            .eq('client_id', cohostUserId)
            .eq('scheduled_date', selectedDate)
            .neq('status', 'not_live')
            .neq('status', 'wrong_credentials'),
          supabase
            .from('meetings')
            .select('*')
            .eq('client_id', cohostUserId)
            .is('scheduled_date', null)
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay)
            .neq('status', 'not_live')
            .neq('status', 'wrong_credentials')
        ]);

        const [scheduledCohostMeetings, instantCohostMeetings] = await Promise.all([
          supabase
            .from('meetings')
            .select('*')
            .eq('cohost_id', cohostUserId)
            .eq('scheduled_date', selectedDate)
            .neq('status', 'not_live')
            .neq('status', 'wrong_credentials'),
          supabase
            .from('meetings')
            .select('*')
            .eq('cohost_id', cohostUserId)
            .is('scheduled_date', null)
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay)
            .neq('status', 'not_live')
            .neq('status', 'wrong_credentials')
        ]);

        const allMeetings = [
          ...(scheduledClientMeetings.data || []),
          ...(instantClientMeetings.data || []),
          ...(scheduledCohostDirect.data || []),
          ...(instantCohostDirect.data || []),
          ...(scheduledCohostMeetings.data || []),
          ...(instantCohostMeetings.data || [])
        ]
          .filter((meeting, index, self) => self.findIndex(m => m.id === meeting.id) === index)
          .sort((a, b) => {
            const hourA = (a.hour || 0) + (a.time_period === 'PM' && a.hour !== 12 ? 12 : 0);
            const hourB = (b.hour || 0) + (b.time_period === 'PM' && b.hour !== 12 ? 12 : 0);
            return hourA - hourB;
          });

        setMeetings(allMeetings);
      } else {
        const [scheduledCohostDirect, instantCohostDirect] = await Promise.all([
          supabase
            .from('meetings')
            .select('*')
            .eq('client_id', cohostUserId)
            .eq('scheduled_date', selectedDate)
            .neq('status', 'not_live')
            .neq('status', 'wrong_credentials'),
          supabase
            .from('meetings')
            .select('*')
            .eq('client_id', cohostUserId)
            .is('scheduled_date', null)
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay)
            .neq('status', 'not_live')
            .neq('status', 'wrong_credentials')
        ]);

        const allMeetings = [
          ...(scheduledCohostDirect.data || []),
          ...(instantCohostDirect.data || [])
        ]
          .filter((meeting, index, self) => self.findIndex(m => m.id === meeting.id) === index)
          .sort((a, b) => {
            const hourA = (a.hour || 0) + (a.time_period === 'PM' && a.hour !== 12 ? 12 : 0);
            const hourB = (b.hour || 0) + (b.time_period === 'PM' && b.hour !== 12 ? 12 : 0);
            return hourA - hourB;
          });

        setMeetings(allMeetings);
      }
    } else {
      const [scheduledClientMeetings, instantClientMeetings] = await Promise.all([
        supabase
          .from('meetings')
          .select('*')
          .in('client_id', clientIds)
          .eq('scheduled_date', selectedDate)
          .neq('status', 'not_live')
          .neq('status', 'wrong_credentials'),
        supabase
          .from('meetings')
          .select('*')
          .in('client_id', clientIds)
          .is('scheduled_date', null)
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay)
          .neq('status', 'not_live')
          .neq('status', 'wrong_credentials')
      ]);

      const [scheduledCohostDirect, instantCohostDirect] = await Promise.all([
        supabase
          .from('meetings')
          .select('*')
          .eq('client_id', cohostUserId)
          .eq('scheduled_date', selectedDate)
          .neq('status', 'not_live')
          .neq('status', 'wrong_credentials'),
        supabase
          .from('meetings')
          .select('*')
          .eq('client_id', cohostUserId)
          .is('scheduled_date', null)
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay)
          .neq('status', 'not_live')
          .neq('status', 'wrong_credentials')
      ]);

      const [scheduledCohostMeetings, instantCohostMeetings] = await Promise.all([
        supabase
          .from('meetings')
          .select('*')
          .eq('cohost_id', cohostUserId)
          .eq('scheduled_date', selectedDate)
          .neq('status', 'not_live')
          .neq('status', 'wrong_credentials'),
        supabase
          .from('meetings')
          .select('*')
          .eq('cohost_id', cohostUserId)
          .is('scheduled_date', null)
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay)
          .neq('status', 'not_live')
          .neq('status', 'wrong_credentials')
      ]);

      const allMeetings = [
        ...(scheduledClientMeetings.data || []),
        ...(instantClientMeetings.data || []),
        ...(scheduledCohostDirect.data || []),
        ...(instantCohostDirect.data || []),
        ...(scheduledCohostMeetings.data || []),
        ...(instantCohostMeetings.data || [])
      ]
        .filter((meeting, index, self) => self.findIndex(m => m.id === meeting.id) === index)
        .sort((a, b) => {
          const hourA = (a.hour || 0) + (a.time_period === 'PM' && a.hour !== 12 ? 12 : 0);
          const hourB = (b.hour || 0) + (b.time_period === 'PM' && b.hour !== 12 ? 12 : 0);
          return hourA - hourB;
        });

      setMeetings(allMeetings);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [selectedDate, clients]);

  const handleCreateClient = async () => {
    if (!newClientName.trim() || !newClientPassword.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setCreatingClient(true);

    try {
      const fullUsername = `${cohostPrefix}_${newClientName.trim()}`;
      const emailForLogin = `${fullUsername.toLowerCase().replace(/\s+/g, '')}@client.junaid.com`;

      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', emailForLogin)
        .maybeSingle();

      if (existing) {
        alert('A client with this name already exists!');
        setCreatingClient(false);
        return;
      }

      const clientRate = newClientRate ? parseFloat(newClientRate) : (cohostRate || 2);

      const { error } = await supabase
        .from('users')
        .insert({
          email: emailForLogin,
          name: newClientName.trim(),
          password_hash: newClientPassword.trim(),
          role: 'client',
          parent_user_id: cohostUserId,
          price_per_member: clientRate
        });

      if (error) {
        throw error;
      }

      setCreatedClientInfo({
        username: fullUsername,
        password: newClientPassword.trim()
      });
      setShowCreateClientModal(false);
      setShowClientCreatedModal(true);
      setNewClientName('');
      setNewClientPassword('');
      setNewClientRate('');
      setCopiedCredentials(false);
      await fetchClientsData();
    } catch (error: any) {
      alert('Error creating client: ' + error.message);
    } finally {
      setCreatingClient(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdClientInfo) return;

    const usernameWithoutPrefix = createdClientInfo.username.includes('_')
      ? createdClientInfo.username.split('_').slice(1).join('_')
      : createdClientInfo.username;

    const message = `Account created successfully.
Welcome to the world of PRO Zoom Services.
Manage your Zoom meetings hassle-free.

Login URL: https://piano4ever.bolt.host
Username: ${usernameWithoutPrefix}
Password: ${createdClientInfo.password}`;

    navigator.clipboard.writeText(message);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 2000);
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete || deleteConfirmText !== 'DELETE') return;

    setDeletingClient(true);

    try {
      await supabase
        .from('daily_dues')
        .delete()
        .eq('client_name', clientToDelete.name);

      await supabase
        .from('payments')
        .delete()
        .eq('client_id', clientToDelete.id);

      await supabase
        .from('meetings')
        .delete()
        .eq('client_id', clientToDelete.id);

      await supabase
        .from('advance_payments')
        .delete()
        .eq('client_name', clientToDelete.name);

      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', clientToDelete.id);

      await supabase
        .from('persistent_notifications')
        .delete()
        .eq('user_id', clientToDelete.id);

      const timestamp = Math.floor(Math.random() * 100000);
      const { error } = await supabase
        .from('users')
        .update({
          is_blocked: true,
          login_enabled: false,
          name: '[DELETED]',
          email: `deleted_${timestamp}@deleted.com`
        })
        .eq('id', clientToDelete.id);

      if (error) throw error;

      setShowDeleteModal(false);
      setClientToDelete(null);
      setDeleteConfirmText('');
      await fetchClientsData();
      alert('Client deleted successfully!');
    } catch (error: any) {
      alert('Error deleting client: ' + error.message);
    } finally {
      setDeletingClient(false);
    }
  };

  const handleSavePaymentMethods = async () => {
    setUploadingQr(true);

    try {
      let qrUrl = existingQrUrl;

      if (qrCodeFile) {
        const fileExt = qrCodeFile.name.split('.').pop();
        const fileName = `${cohostUserId}-qr-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        console.log('Uploading QR code to cohost-qr-codes bucket:', filePath);
        const { error: uploadError } = await supabase.storage
          .from('cohost-qr-codes')
          .upload(filePath, qrCodeFile, {
            upsert: true
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('cohost-qr-codes')
          .getPublicUrl(filePath);

        qrUrl = publicUrl;
        console.log('QR uploaded successfully:', qrUrl);
      }

      console.log('Checking existing payment methods...');
      const { data: existing, error: fetchError } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('cohost_user_id', cohostUserId)
        .maybeSingle();

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        throw new Error(`Failed to fetch: ${fetchError.message}`);
      }

      if (existing) {
        console.log('Updating existing payment methods...');
        const { error: updateError } = await supabase
          .from('payment_methods')
          .update({
            upi_id: upiId,
            usdt_bep20_address: bep20Address,
            usdt_trc20_address: trc20Address,
            qr_code_url: qrUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('Update error:', updateError);
          throw new Error(`Update failed: ${updateError.message}`);
        }
      } else {
        console.log('Inserting new payment methods...');
        const { error: insertError } = await supabase
          .from('payment_methods')
          .insert({
            cohost_user_id: cohostUserId,
            upi_id: upiId,
            usdt_bep20_address: bep20Address,
            usdt_trc20_address: trc20Address,
            qr_code_url: qrUrl
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          throw new Error(`Insert failed: ${insertError.message}`);
        }
      }

      setExistingQrUrl(qrUrl);
      setQrCodeFile(null);

      if (notifyClientsOnUpdate) {
        const { data: directClients } = await supabase
          .from('users')
          .select('id, name')
          .eq('parent_user_id', cohostUserId)
          .eq('role', 'client');

        if (directClients && directClients.length > 0) {
          const notifications = directClients.map(client => ({
            user_id: client.id,
            type: 'info',
            title: 'Payment Methods Updated',
            message: `${cohostName} has updated their payment methods. Please check the new payment details.`,
            is_read: false
          }));

          await supabase.from('persistent_notifications').insert(notifications);
        }
      }

      alert('Payment methods updated successfully!' + (notifyClientsOnUpdate ? ' Clients have been notified.' : ''));
      setShowPaymentSettings(false);
      setNotifyClientsOnUpdate(false);
      await fetchPaymentMethods();
    } catch (error: any) {
      console.error('Error updating payment methods:', error);
      alert(`Failed to update payment methods: ${error.message || 'Unknown error'}`);
    } finally {
      setUploadingQr(false);
    }
  };

  if (viewingClientPanel && viewingClientData) {
    return (
      <div className="fixed inset-0 z-[60]">
        <button
          onClick={() => {
            setViewingClientPanel(false);
            setViewingClientData(null);
          }}
          className={`fixed top-4 left-4 z-[100] px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-lg ${
            isDark
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          <ArrowLeft size={18} />
          Back to Clients
        </button>
        <div className="h-full overflow-y-auto">
          <ClientPanel user={viewingClientData} onLogout={() => {
            setViewingClientPanel(false);
            setViewingClientData(null);
          }} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`max-w-7xl w-full max-h-[95vh] overflow-y-auto rounded-2xl shadow-2xl ${
          isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-all ${
                isDark ? 'hover:bg-slate-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Close"
            >
              <X size={24} />
            </button>
            <div>
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {cohostName}'s Client Dashboard
              </h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Co-host Prefix: <span className="font-bold text-purple-500">{cohostPrefix}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateClientModal(true)}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                isDark
                  ? 'bg-blue-600/10 text-blue-400 hover:bg-blue-600/20'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              <UserPlus size={18} />
              Create Client
            </button>
            <button
              onClick={() => setShowPaymentSettings(true)}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                isDark
                  ? 'bg-green-600/10 text-green-400 hover:bg-green-600/20'
                  : 'bg-green-50 text-green-600 hover:bg-green-100'
              }`}
            >
              <Wallet size={18} />
              Payment Settings
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-all ${
                isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'
              }`}
            >
              <X size={24} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {(cohostOwnDues > 0 || cohostTotalPaid > 0) && (
                <div className={`mb-6 p-6 rounded-xl border-2 ${
                  isDark
                    ? 'bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-500/30'
                    : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'
                }`}>
                  <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    <DollarSign size={20} />
                    Your Dues to Admin (from Sub-Client Meetings)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg ${
                      isDark
                        ? 'bg-red-900/30 border-2 border-red-500/30'
                        : 'bg-red-50 border-2 border-red-200'
                    }`}>
                      <p className={`text-sm font-semibold mb-2 ${isDark ? 'text-red-300' : 'text-red-600'}`}>
                        Net Due to Admin
                      </p>
                      <p className={`text-3xl font-black ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                        {'\u20B9'}{formatIndianNumber(cohostOwnDues)}
                      </p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-red-300' : 'text-red-600'}`}>
                        Admin rate per member from your sub-clients
                      </p>
                    </div>
                    <div className={`p-4 rounded-lg ${
                      isDark
                        ? 'bg-green-900/30 border-2 border-green-500/30'
                        : 'bg-green-50 border-2 border-green-200'
                    }`}>
                      <p className={`text-sm font-semibold mb-2 ${isDark ? 'text-green-300' : 'text-green-600'}`}>
                        Total Paid to Admin
                      </p>
                      <p className={`text-3xl font-black ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                        {'\u20B9'}{formatIndianNumber(cohostTotalPaid)}
                      </p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-green-300' : 'text-green-600'}`}>
                        Lifetime payments to admin
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {pendingPayments.length > 0 && (
                <div className={`mb-6 rounded-2xl shadow-xl border-2 overflow-hidden ${
                  isDark
                    ? 'bg-gradient-to-br from-orange-900/30 via-red-900/20 to-amber-900/30 border-orange-600/50'
                    : 'bg-gradient-to-br from-orange-50 via-red-50 to-amber-50 border-orange-300'
                }`}>
                  <div className={`px-6 py-4 border-b ${isDark ? 'border-orange-700/50 bg-orange-900/30' : 'border-orange-200 bg-orange-100/50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${isDark ? 'bg-orange-600' : 'bg-gradient-to-br from-orange-500 to-red-500'} shadow-lg`}>
                          <Wallet size={24} className="text-white" />
                        </div>
                        <div>
                          <h3 className={`text-xl font-black ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
                            Sub-Client Payment Approvals
                          </h3>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Review and approve payments from your sub-clients
                          </p>
                        </div>
                      </div>
                      <span className={`px-4 py-2 rounded-full font-black text-lg shadow-lg ${
                        isDark
                          ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white'
                          : 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                      } animate-pulse`}>
                        {pendingPayments.length} Pending
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {pendingPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className={`rounded-xl border-2 overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-xl ${
                          isDark
                            ? 'bg-slate-800/80 border-slate-600 hover:border-orange-500'
                            : 'bg-white border-gray-200 hover:border-orange-400'
                        }`}
                      >
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-center gap-4">
                              <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg ${
                                isDark
                                  ? 'bg-gradient-to-br from-orange-600 to-red-600'
                                  : 'bg-gradient-to-br from-orange-500 to-red-500'
                              }`}>
                                <span className="text-white font-black text-xl">
                                  {payment.client_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  {payment.client_name}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Calendar size={14} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {new Date(payment.payment_date).toLocaleDateString('en-IN', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric'
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className={`text-right px-5 py-3 rounded-xl ${
                              isDark
                                ? 'bg-gradient-to-br from-green-900/50 to-emerald-900/50 border border-green-600/50'
                                : 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200'
                            }`}>
                              <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                Payment Amount
                              </p>
                              <p className={`text-3xl font-black ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                Rs {formatIndianNumber(payment.amount)}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {payment.screenshot_url && (
                              <button
                                onClick={() => window.open(payment.screenshot_url, '_blank')}
                                className={`px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                                  isDark
                                    ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30'
                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                                }`}
                              >
                                <Eye size={18} />
                                View Proof
                              </button>
                            )}
                            <button
                              onClick={() => approvePayment(payment)}
                              className="px-4 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                            >
                              <CheckCircle size={18} />
                              Approve
                            </button>
                            <button
                              onClick={() => setSelectedPayment(payment)}
                              className="px-4 py-3 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                            >
                              <XCircle size={18} />
                              Reject
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Delete payment from ${payment.client_name} without notifying them?`)) {
                                  await supabase.from('payment_receiving').delete().eq('id', payment.id);
                                  await fetchPendingPayments();
                                }
                              }}
                              className={`px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                                isDark
                                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              <Trash2 size={18} />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPayment && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setSelectedPayment(null)}>
                  <div className={`max-w-md w-full rounded-2xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
                    <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Reject Payment</h3>
                    <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      Reject payment of Rs {formatIndianNumber(selectedPayment.amount)} from {selectedPayment.client_name}?
                    </p>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection (optional)"
                      className={`w-full p-3 rounded-lg mb-4 ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-gray-100 text-gray-900 border-gray-200'} border`}
                      rows={3}
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedPayment(null)}
                        className={`flex-1 py-2 rounded-lg ${isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => rejectPayment(selectedPayment, rejectReason)}
                        className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
                      >
                        Reject Payment
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {clients.length === 0 ? (
                <div className="text-center py-20">
                  <Users size={64} className={`mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                  <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    No Clients Yet
                  </h3>
                  <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    Clients will appear here once they register using your prefix
                  </p>
                </div>
              ) : (
                <>
                  <div className={`rounded-xl p-4 mb-4 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'}`}>
                    <div className="relative">
                      <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} size={20} />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search clients by name..."
                        className={`w-full pl-12 pr-4 py-3 rounded-lg border-2 focus:ring-2 focus:ring-blue-500 outline-none font-semibold ${
                          isDark
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    {clients.filter(client =>
                      client.name.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map((client) => (
                    <div
                      key={client.id}
                      className={`rounded-xl border transition-all overflow-hidden ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 hover:border-slate-600'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* Client Header */}
                      <div className={`p-4 ${
                        client.netProfit > 0
                          ? isDark ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30' : 'bg-gradient-to-r from-green-50 to-emerald-50'
                          : isDark ? 'bg-slate-800' : 'bg-gray-50'
                      }`}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${
                              isDark ? 'bg-gradient-to-br from-blue-600 to-cyan-600' : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                            }`}>
                              <span className="text-white font-bold text-xl">
                                {client.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  {client.name}
                                </h3>
                                {client.isBlocked && (
                                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white">
                                    BLOCKED
                                  </span>
                                )}
                                {client.advanceAmount > 0 && (
                                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-500 text-white">
                                    ADVANCE: {'\u20B9'}{formatIndianNumber(client.advanceAmount)}
                                  </span>
                                )}
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${isDark ? 'bg-slate-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                                  Rate: {'\u20B9'}{client.pricePerMember}/member
                                </span>
                              </div>
                              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {client.email}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleViewPassword(client)}
                              className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-sm ${
                                isDark
                                  ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'
                                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                              }`}
                            >
                              <Key size={14} />
                            </button>
                            <button
                              onClick={() => handleLoginAsClient(client)}
                              className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-sm ${
                                isDark
                                  ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                                  : 'bg-green-50 text-green-600 hover:bg-green-100'
                              }`}
                            >
                              <LogIn size={14} />
                            </button>
                            <button
                              onClick={() => toggleClientBlock(client.id, client.isBlocked)}
                              className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-semibold ${
                                client.isBlocked
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-orange-600 hover:bg-orange-700 text-white'
                              }`}
                            >
                              {client.isBlocked ? <CheckCircle size={14} /> : <XCircle size={14} />}
                            </button>
                            <button
                              onClick={() => {
                                setClientToDelete(client);
                                setDeleteConfirmText('');
                                setShowDeleteModal(true);
                              }}
                              className="px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Client Stats Grid */}
                      <div className={`p-4 grid grid-cols-1 md:grid-cols-2 gap-4 ${isDark ? 'bg-slate-800/50' : 'bg-gray-50/50'}`}>
                        <div className={`p-4 rounded-lg ${isDark ? 'bg-red-900/30 border-2 border-red-500/30' : 'bg-red-50 border-2 border-red-200'}`}>
                          <p className={`text-sm font-semibold mb-2 ${isDark ? 'text-red-300' : 'text-red-600'}`}>Net Due</p>
                          <p className={`text-3xl font-black mb-2 ${client.totalDues > 0 ? (isDark ? 'text-red-400' : 'text-red-600') : (isDark ? 'text-green-400' : 'text-green-600')}`}>
                            {'\u20B9'}{formatIndianNumber(client.totalDues)}
                          </p>
                          {client.unpaidDays > 0 && (
                            <p className={`text-xs font-semibold ${isDark ? 'text-red-300' : 'text-red-600'}`}>
                              {client.unpaidDays} {client.unpaidDays === 1 ? 'day' : 'days'} of accumulated dues
                            </p>
                          )}
                        </div>

                        <div className={`p-4 rounded-lg ${isDark ? 'bg-green-900/30 border-2 border-green-500/30' : 'bg-green-50 border-2 border-green-200'}`}>
                          <p className={`text-sm font-semibold mb-2 ${isDark ? 'text-green-300' : 'text-green-600'}`}>Total Paid</p>
                          <p className={`text-3xl font-black mb-2 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                            {'\u20B9'}{formatIndianNumber(client.totalPaidAmount)}
                          </p>
                          <p className={`text-xs font-semibold ${
                            client.lastPaymentDate
                              ? isDark ? 'text-green-300' : 'text-green-600'
                              : isDark ? 'text-orange-400' : 'text-orange-500'
                          }`}>
                            Last payment: {client.lastPaymentDate
                              ? new Date(client.lastPaymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                              : 'Never'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            </>
          )}
        </div>
      </div>

      {showPasswordModal && selectedClient && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setShowPasswordModal(false)}>
          <div
            className={`max-w-md w-full rounded-2xl p-6 ${
              isDark ? 'bg-slate-800' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Client Credentials
            </h3>
            <div className="space-y-3 mb-6">
              <div>
                <label className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Email
                </label>
                <p className={`font-mono mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {selectedClient.email}
                </p>
              </div>
              <div>
                <label className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Password
                </label>
                <p className={`font-mono mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {clientPassword}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPasswordModal(false)}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showPaymentSettings && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setShowPaymentSettings(false)}>
          <div
            className={`max-w-2xl w-full rounded-2xl p-6 max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-slate-800' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Payment Settings
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  UPI ID
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    isDark
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="yourname@upi"
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  UPI QR Code
                </label>
                {existingQrUrl && (
                  <div className="mb-3">
                    <img src={existingQrUrl} alt="Current QR" className="w-32 h-32 rounded-lg border" />
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Current QR Code
                    </p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setQrCodeFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="qr-upload"
                />
                <label
                  htmlFor="qr-upload"
                  className={`flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl border cursor-pointer ${
                    isDark
                      ? 'bg-slate-700 border-slate-600 text-gray-300 hover:bg-slate-600'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Upload size={20} />
                  <span>{qrCodeFile ? qrCodeFile.name : 'Upload QR Code'}</span>
                </label>
              </div>

              <div className="border-t pt-4 mt-4"></div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  BEP20 USDT Address (Binance Smart Chain)
                </label>
                <input
                  type="text"
                  value={bep20Address}
                  onChange={(e) => setBep20Address(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border font-mono text-sm ${
                    isDark
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="0x..."
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  TRC20 USDT Address (Tron Network)
                </label>
                <input
                  type="text"
                  value={trc20Address}
                  onChange={(e) => setTrc20Address(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border font-mono text-sm ${
                    isDark
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="T..."
                />
              </div>

              <div className="border-t pt-4">
                <label className={`flex items-center gap-3 cursor-pointer p-4 rounded-xl ${
                  isDark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'
                } transition-colors`}>
                  <input
                    type="checkbox"
                    checked={notifyClientsOnUpdate}
                    onChange={(e) => setNotifyClientsOnUpdate(e.target.checked)}
                    className="w-5 h-5 rounded accent-blue-600"
                  />
                  <div>
                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Notify All Clients
                    </p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Send notification to all your direct clients about this payment method update
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSavePaymentMethods}
                disabled={uploadingQr}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all font-semibold disabled:opacity-50"
              >
                {uploadingQr ? 'Saving...' : 'Save Payment Settings'}
              </button>
              <button
                onClick={() => setShowPaymentSettings(false)}
                className={`px-4 py-3 rounded-xl transition-all font-semibold ${
                  isDark
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateClientModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setShowCreateClientModal(false)}>
          <div
            className={`max-w-md w-full rounded-2xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <UserPlus size={24} className="text-blue-500" />
                Create New Client
              </h3>
              <button
                onClick={() => setShowCreateClientModal(false)}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Client Name
                </label>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-3 rounded-l-xl border-r-0 font-bold ${
                    isDark
                      ? 'bg-slate-700 border border-slate-600 text-blue-400'
                      : 'bg-gray-100 border border-gray-300 text-blue-600'
                  }`}>
                    {cohostPrefix}_
                  </span>
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className={`flex-1 px-4 py-3 rounded-r-xl border ${
                      isDark
                        ? 'bg-slate-700 border-slate-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Enter client name"
                  />
                </div>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Full username will be: {cohostPrefix}_{newClientName || 'ClientName'}
                </p>
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Password
                </label>
                <input
                  type="text"
                  value={newClientPassword}
                  onChange={(e) => setNewClientPassword(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    isDark
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Enter password"
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Rate per Member (INR)
                </label>
                <input
                  type="number"
                  value={newClientRate}
                  onChange={(e) => setNewClientRate(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    isDark
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder={`Default: ${cohostRate || 2}`}
                  step="0.1"
                  min="0"
                />
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Leave empty to use default rate ({'\u20B9'}{cohostRate || 2})
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateClientModal(false)}
                className={`flex-1 px-4 py-3 rounded-xl transition-all font-semibold ${
                  isDark
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateClient}
                disabled={creatingClient || !newClientName.trim() || !newClientPassword.trim()}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creatingClient ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    Create Client
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showClientCreatedModal && createdClientInfo && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setShowClientCreatedModal(false)}>
          <div
            className={`max-w-md w-full rounded-2xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                isDark ? 'bg-green-600/20' : 'bg-green-100'
              }`}>
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Client Created Successfully!
              </h3>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Share the following credentials with your client
              </p>
            </div>

            <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
              <div className="space-y-3">
                <div>
                  <label className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    LOGIN URL
                  </label>
                  <p className={`font-mono text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    https://piano4ever.bolt.host
                  </p>
                </div>
                <div>
                  <label className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    USERNAME
                  </label>
                  <p className={`font-mono font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {createdClientInfo.username.includes('_')
                      ? createdClientInfo.username.split('_').slice(1).join('_')
                      : createdClientInfo.username}
                  </p>
                </div>
                <div>
                  <label className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    PASSWORD
                  </label>
                  <p className={`font-mono font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {createdClientInfo.password}
                  </p>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50 border border-green-200'}`}>
              <p className={`text-sm ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                <strong>Welcome Message:</strong><br />
                Account created successfully.<br />
                Welcome to the world of PRO Zoom Services.<br />
                Manage your Zoom meetings hassle-free.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCopyCredentials}
                className={`flex-1 px-4 py-3 rounded-xl transition-all font-semibold flex items-center justify-center gap-2 ${
                  copiedCredentials
                    ? 'bg-green-600 text-white'
                    : isDark
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copiedCredentials ? (
                  <>
                    <CheckCircle size={18} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    Copy Credentials
                  </>
                )}
              </button>
              <button
                onClick={() => setShowClientCreatedModal(false)}
                className={`px-4 py-3 rounded-xl transition-all font-semibold ${
                  isDark
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && clientToDelete && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
          <div
            className={`max-w-md w-full rounded-2xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                isDark ? 'bg-red-600/20' : 'bg-red-100'
              }`}>
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Delete Client
              </h3>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Are you sure you want to delete <strong>{clientToDelete.name}</strong>?
              </p>
            </div>

            <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-red-900/20 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                <strong>Warning:</strong> This action will permanently delete:
              </p>
              <ul className={`text-sm mt-2 list-disc list-inside ${isDark ? 'text-red-300' : 'text-red-600'}`}>
                <li>Client account and credentials</li>
                <li>All meetings history</li>
                <li>All payment records</li>
                <li>All dues records</li>
              </ul>
              <p className={`text-sm mt-2 font-bold ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                This cannot be undone!
              </p>
            </div>

            <div className="mb-4">
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Type <span className="text-red-500 font-bold">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } ${deleteConfirmText === 'DELETE' ? 'border-green-500' : ''}`}
                placeholder="Type DELETE"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setClientToDelete(null);
                  setDeleteConfirmText('');
                }}
                className={`flex-1 px-4 py-3 rounded-xl transition-all font-semibold ${
                  isDark
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteClient}
                disabled={deleteConfirmText !== 'DELETE' || deletingClient}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletingClient ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Delete Client
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
