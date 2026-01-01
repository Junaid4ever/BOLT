import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, LogOut, Clock, Users, Trash2, Image as ImageIcon, Loader, Moon, Sun, Calendar, AlertTriangle, Eye, EyeOff, Key, ArrowLeft, ArrowRight, FileText, RefreshCw, X, Video, Search, IndianRupee, Shield, TrendingDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getRandomHindiName } from '../utils/indianNameGenerator';
import { RupeeSymbol } from './RupeeSymbol';
import { PaymentFormWizard } from './PaymentFormWizard';
import { DailyMeetingRecurring } from './DailyMeetingRecurring';
import { CohostClientDashboard } from './CohostClientDashboard';
import { CohostProfitStack } from './CohostProfitStack';
import { PaymentCongratulationsNotification } from './PaymentCongratulationsNotification';

interface ClientPanelProps {
  user: any;
  onLogout: () => void;
}

interface Meeting {
  id: string;
  meeting_name: string;
  meeting_id: string;
  password: string;
  hour?: number;
  minutes?: number;
  time_period?: 'AM' | 'PM';
  member_count?: number;
  member_type?: 'indian' | 'foreigners';
  is_instant: boolean;
  attended: boolean;
  screenshot_url?: string;
  status?: 'active' | 'not_live' | 'cancelled' | 'wrong_credentials';
  created_at: string;
  alreadyAddedToday?: boolean;
  client_name?: string;
  display_name?: string;
}

export function ClientPanel({ user, onLogout }: ClientPanelProps) {
  const { isDark, toggleTheme } = useTheme();
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const paymentSectionRef = useRef<HTMLDivElement>(null);
  const breakdownSectionRef = useRef<HTMLDivElement>(null);
  const fetchDailyDuesDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const fetchMyPaymentsDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const inputClassName = isDark
    ? 'w-full px-4 py-2.5 rounded-xl border-2 bg-gray-900 border-gray-500 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all duration-300 placeholder-gray-400 shadow-lg'
    : 'w-full px-4 py-2.5 rounded-xl border bg-white border-gray-300 text-gray-900 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition-all duration-300';

  const labelClassName = isDark ? 'block text-sm font-semibold text-gray-100 mb-2' : 'block text-sm font-semibold text-gray-700 mb-2';
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [meetingName, setMeetingName] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [password, setPassword] = useState('');
  const [hour, setHour] = useState(8);
  const [minutes, setMinutes] = useState(5);
  const [timePeriod, setTimePeriod] = useState<'AM' | 'PM'>('PM');
  const [memberCount, setMemberCount] = useState(1);
  const [memberType, setMemberType] = useState<'indian' | 'foreigners'>('indian');
  const [isInstant, setIsInstant] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [previousMeetings, setPreviousMeetings] = useState<Meeting[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dailyNetDue, setDailyNetDue] = useState(0);
  const [totalNetDueTillToday, setTotalNetDueTillToday] = useState(0);
  const [showDueAmount, setShowDueAmount] = useState(false);
  const [showMemberCount, setShowMemberCount] = useState(false);
  const [pricePerMember, setPricePerMember] = useState(0);
  const [pricePerForeignMember, setPricePerForeignMember] = useState(0);
  const [pricePerDpMember, setPricePerDpMember] = useState(240);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [myPayments, setMyPayments] = useState<any[]>([]);
  const [upiId, setUpiId] = useState('');
  const [usdtAddress, setUsdtAddress] = useState('');
  const [usdtNetwork, setUsdtNetwork] = useState('TRC20');
  const [cohostRequestStatus, setCohostRequestStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [dateLabel, setDateLabel] = useState('Today');
  const [paymentMethodWarning, setPaymentMethodWarning] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [screenshotNotification, setScreenshotNotification] = useState<string | null>(null);
  const [dailyDues, setDailyDues] = useState<any[]>([]);
  const [totalNetDue, setTotalNetDue] = useState(0);
  const [selectedDueDate, setSelectedDueDate] = useState<string | null>(null);
  const [paymentUptoDate, setPaymentUptoDate] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showMeetingBreakdown, setShowMeetingBreakdown] = useState(false);
  const [paymentSettledTill, setPaymentSettledTill] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<{id: string; message: string; time: string; read: boolean; type: 'screenshot' | 'payment'}[]>([]);
  const [recurringMeetings, setRecurringMeetings] = useState<any[]>([]);
  const [showRecurringList, setShowRecurringList] = useState(false);
  const [showAttendedWindow, setShowAttendedWindow] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundMuted, setSoundMuted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [soundVolume, setSoundVolume] = useState(0.5);
  const [showSoundControls, setShowSoundControls] = useState(false);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [meetingsCache, setMeetingsCache] = useState<{[key: string]: Meeting[]}>({});
  const [moneySoundPlayed, setMoneySoundPlayed] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [paymentView, setPaymentView] = useState<'make-payment' | 'past-payments'>('make-payment');
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [showReplicateModal, setShowReplicateModal] = useState(false);
  const [yesterdayMeetings, setYesterdayMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingsToReplicate, setSelectedMeetingsToReplicate] = useState<Set<string>>(new Set());
  const [todayEstimatePayment, setTodayEstimatePayment] = useState(0);
  const [todayTotalMembers, setTodayTotalMembers] = useState(0);
  const [meetingViewMode, setMeetingViewMode] = useState<'list' | 'stack'>('list');
  const [todayIncome, setTodayIncome] = useState(0);
  const [netDueTillToday, setNetDueTillToday] = useState(0);
  const [isCohost, setIsCohost] = useState(false);
  const [cohostStatusLoaded, setCohostStatusLoaded] = useState(false);
  const [cohostRate, setCohostRate] = useState(1);
  const [parentUserId, setParentUserId] = useState<string | null>(null);
  const [parentUserName, setParentUserName] = useState<string>('');
  const [isSubClient, setIsSubClient] = useState(false);
  const [cohostPrefix, setCohostPrefix] = useState('');
  const [myClients, setMyClients] = useState<any[]>([]);
  const [showManageClients, setShowManageClients] = useState(false);
  const [showCohostDashboard, setShowCohostDashboard] = useState(false);
  const [isAdminImpersonating, setIsAdminImpersonating] = useState(false);
  const [showSubClientPayModal, setShowSubClientPayModal] = useState(false);
  const [showSubClientMeetings, setShowSubClientMeetings] = useState(false);
  const [subClientMeetings, setSubClientMeetings] = useState<Meeting[]>([]);
  const [subClientPaymentScreenshot, setSubClientPaymentScreenshot] = useState<File | null>(null);
  const [subClientPaymentAmount, setSubClientPaymentAmount] = useState('');
  const [subClientPaymentSubmitting, setSubClientPaymentSubmitting] = useState(false);
  const [cohostPaymentMethods, setCohostPaymentMethods] = useState<any>(null);
  const [parentCohostName, setParentCohostName] = useState('');
  const [showCongratsModal, setShowCongratsModal] = useState(false);
  const [congratsMessage, setCongratsMessage] = useState('');
  const [showPaymentCongrats, setShowPaymentCongrats] = useState(false);
  const [approvedPaymentAmount, setApprovedPaymentAmount] = useState(0);

  useEffect(() => {
    const impersonateClientId = localStorage.getItem('impersonate_client_id');
    const adminBackup = localStorage.getItem('admin_user_backup');
    setIsAdminImpersonating(!!impersonateClientId && !!adminBackup);
  }, []);

  useEffect(() => {
    const fetchPaymentApprovalNotification = async () => {
      try {
        const { data: pendingPayment, error } = await supabase
          .from('payments')
          .select('id, amount, client_name')
          .eq('client_name', user.username)
          .eq('status', 'approved')
          .eq('notification_shown', false)
          .order('approved_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pendingPayment && !error) {
          setApprovedPaymentAmount(pendingPayment.amount);
          setShowPaymentCongrats(true);
        }
      } catch (err) {
        console.error('Error fetching payment notification:', err);
      }
    };

    if (user?.username) {
      fetchPaymentApprovalNotification();
    }
  }, [user?.username]);

  const handleBackToAdmin = () => {
    const adminBackup = localStorage.getItem('admin_user_backup');
    localStorage.removeItem('impersonate_client_id');
    localStorage.removeItem('impersonate_client_name');
    if (adminBackup) {
      localStorage.setItem('user', adminBackup);
      localStorage.removeItem('admin_user_backup');
    }
    window.location.reload();
  };

  const handlePaymentNotificationComplete = async () => {
    try {
      await supabase
        .from('payments')
        .update({ notification_shown: true })
        .eq('client_name', user.username)
        .eq('status', 'approved')
        .eq('notification_shown', false);
    } catch (err) {
      console.error('Error marking notification as shown:', err);
    }
  };

  const playNotificationSound = () => {
    if (soundMuted) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.3 * soundVolume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const playMoneyCountingSound = () => {
    if (soundMuted || moneySoundPlayed) return;

    setMoneySoundPlayed(true);

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];
    let time = audioContext.currentTime;

    notes.forEach((frequency) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, time);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(soundVolume * 0.15, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

      oscillator.start(time);
      oscillator.stop(time + 0.1);

      time += 0.08;
    });
  };

  const goToPreviousDate = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() - 1);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const goToNextDate = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    const today = new Date().toISOString().split('T')[0];
    const nextDate = currentDate.toISOString().split('T')[0];
    if (nextDate <= today) {
      setSelectedDate(nextDate);
    }
  };

  const isToday = () => {
    const today = new Date().toISOString().split('T')[0];
    return selectedDate === today;
  };

  const downloadAndShareImage = async (meeting: Meeting) => {
    if (!meeting.screenshot_url) return;

    try {
      const response = await fetch(meeting.screenshot_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meeting.meeting_name}-screenshot.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setTimeout(() => {
        alert('Image downloaded! Now you can manually share it on WhatsApp from your gallery/downloads.');
      }, 500);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download image. Please try again.');
    }
  };

  const calculateMeetingPayment = (meeting: Meeting) => {
    if (!meeting.member_count || meeting.member_count <= 0) return 0;

    const rate = meeting.member_type === 'foreigners' ? pricePerForeignMember : pricePerMember;
    return meeting.member_count * rate;
  };

  const handleReplicateYesterday = async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      const ownYesterdayResult = await supabase
        .from('meetings')
        .select('*')
        .eq('client_name', user.name)
        .eq('scheduled_date', yesterdayDate)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });

      let allYesterdayMeetings = ownYesterdayResult.data || [];

      if (isCohost) {
        const { data: subClientsData } = await supabase
          .from('users')
          .select('id, name')
          .eq('parent_user_id', user?.id)
          .eq('role', 'client');

        const subClientIds = subClientsData?.map(s => s.id) || [];

        if (subClientIds.length > 0) {
          const subClientYesterdayResult = await supabase
            .from('meetings')
            .select('*')
            .eq('scheduled_date', yesterdayDate)
            .in('client_id', subClientIds)
            .neq('status', 'deleted')
            .order('created_at', { ascending: false });

          allYesterdayMeetings = [
            ...allYesterdayMeetings,
            ...(subClientYesterdayResult.data || [])
          ];
        }
      }

      const ownTodayResult = await supabase
        .from('meetings')
        .select('meeting_id')
        .eq('client_name', user.name)
        .eq('scheduled_date', todayStr)
        .neq('status', 'deleted');

      let allTodayMeetingIds = new Set(
        (ownTodayResult.data || []).map((m: any) => m.meeting_id)
      );

      if (isCohost) {
        const { data: subClientsData } = await supabase
          .from('users')
          .select('id, name')
          .eq('parent_user_id', user?.id)
          .eq('role', 'client');

        const subClientIds = subClientsData?.map(s => s.id) || [];

        if (subClientIds.length > 0) {
          const subClientTodayResult = await supabase
            .from('meetings')
            .select('meeting_id')
            .eq('scheduled_date', todayStr)
            .in('client_id', subClientIds)
            .neq('status', 'deleted');

          (subClientTodayResult.data || []).forEach((m: any) => {
            allTodayMeetingIds.add(m.meeting_id);
          });
        }
      }

      const meetingsWithStatus = allYesterdayMeetings.map((meeting: any) => ({
        ...meeting,
        alreadyAddedToday: allTodayMeetingIds.has(meeting.meeting_id)
      }));

      if (meetingsWithStatus.length === 0) {
        alert('No meetings found from yesterday to replicate.');
        return;
      }

      setYesterdayMeetings(meetingsWithStatus);
      setSelectedMeetingsToReplicate(new Set());
      setShowReplicateModal(true);
    } catch (error) {
      console.error('Error fetching yesterday meetings:', error);
      alert('Failed to fetch yesterday\'s meetings. Please try again.');
    }
  };

  const handleConfirmReplicate = async () => {
    const today = new Date().toISOString().split('T')[0];

    if (selectedMeetingsToReplicate.size === 0) {
      alert('Please select at least one meeting to replicate.');
      return;
    }

    try {
      const selectedMeetings = yesterdayMeetings.filter(m =>
        selectedMeetingsToReplicate.has(m.id) && !m.alreadyAddedToday
      );

      if (selectedMeetings.length === 0) {
        alert('All selected meetings are already added to today\'s list!');
        setShowReplicateModal(false);
        return;
      }

      const { data: currentTodayMeetings } = await supabase
        .from('meetings')
        .select('meeting_id')
        .eq('client_name', user.name)
        .eq('scheduled_date', today)
        .neq('status', 'deleted');

      const existingMeetingIds = new Set(
        (currentTodayMeetings || []).map((m: any) => m.meeting_id)
      );

      console.log('Existing meeting IDs for today:', Array.from(existingMeetingIds));
      console.log('Selected meetings to check:', selectedMeetings.map(m => ({
        id: m.id,
        meeting_id: m.meeting_id,
        name: m.meeting_name
      })));

      const meetingsToAdd = selectedMeetings
        .filter(meeting => {
          const isDuplicate = existingMeetingIds.has(meeting.meeting_id);
          if (isDuplicate) {
            console.log(`Skipping duplicate: ${meeting.meeting_name} (${meeting.meeting_id})`);
          }
          return !isDuplicate;
        })
        .map(meeting => ({
          meeting_name: meeting.meeting_name,
          meeting_id: meeting.meeting_id,
          password: meeting.password,
          hour: meeting.hour,
          minutes: meeting.minutes,
          time_period: meeting.time_period,
          member_count: meeting.member_count,
          member_type: meeting.member_type,
          is_instant: false,
          attended: false,
          client_name: user.name,
          client_id: user.id,
          scheduled_date: today,
          status: 'active'
        }));

      console.log('Meetings that will be added:', meetingsToAdd.length);

      if (meetingsToAdd.length === 0) {
        const skippedCount = selectedMeetings.length;
        alert(`All ${skippedCount} selected meeting(s) are already added to today's list!`);
        setShowReplicateModal(false);
        return;
      }

      const { data: insertedMeetings, error: insertError } = await supabase
        .from('meetings')
        .insert(meetingsToAdd)
        .select();

      if (insertError) {
        console.error('Replication error details:', insertError);
        if (insertError.message?.includes('duplicate') || insertError.code === '23505') {
          alert('Some meetings are already added today. Duplicate meetings cannot be added.');
        } else {
          alert('Failed to replicate meetings: ' + (insertError.message || 'Please try again'));
        }
        setShowReplicateModal(false);
        fetchMeetings();
        return;
      }

      alert(`Successfully replicated ${meetingsToAdd.length} meeting(s) from yesterday to today!`);

      setMeetings(prev => [...(insertedMeetings || []), ...prev]);
      setShowReplicateModal(false);
      setSelectedDate(today);
      setMeetingsCache(prev => {
        const newCache = { ...prev };
        delete newCache[today];
        return newCache;
      });
      fetchMeetings();
    } catch (error: any) {
      console.error('Error replicating meetings:', error);
      alert('Failed to replicate meetings: ' + (error?.message || 'Please try again'));
    }
  };

  const toggleMeetingSelection = (meetingId: string) => {
    const meeting = yesterdayMeetings.find(m => m.id === meetingId);
    if (meeting?.alreadyAddedToday) {
      return;
    }
    setSelectedMeetingsToReplicate(prev => {
      const newSet = new Set(prev);
      if (newSet.has(meetingId)) {
        newSet.delete(meetingId);
      } else {
        newSet.add(meetingId);
      }
      return newSet;
    });
  };

  const handleSelectAllToReplicate = () => {
    const selectableMeetings = yesterdayMeetings
      .filter(m => !m.alreadyAddedToday)
      .map(m => m.id);
    setSelectedMeetingsToReplicate(new Set(selectableMeetings));
  };

  const handleDeselectAllToReplicate = () => {
    setSelectedMeetingsToReplicate(new Set());
  };

  const handleOpenAll = () => {
    const filteredMeetings = getFilteredMeetings();
    const meetingsToOpen = filteredMeetings
      .filter(m => !m.attended && m.status !== 'cancelled' && m.status !== 'wrong_credentials')
      .sort((a, b) => {
        const memberCountA = a.member_count || 0;
        const memberCountB = b.member_count || 0;
        if (memberCountA !== memberCountB) {
          return memberCountB - memberCountA;
        }
        const hourA = (a.hour || 0) + (a.time_period === 'PM' ? 12 : 0);
        const hourB = (b.hour || 0) + (b.time_period === 'PM' ? 12 : 0);
        return hourA - hourB;
      });

    if (meetingsToOpen.length === 0) {
      alert('No meetings available to open with the current filter!');
      return;
    }

    if (meetingsToOpen.length > 10) {
      if (!confirm(`You are about to open ${meetingsToOpen.length} meetings. This might slow down your browser. Continue?`)) {
        return;
      }
    }

    meetingsToOpen.forEach((meeting, index) => {
      setTimeout(() => {
        const zoomUrl = `https://zoom.us/wc/join/${meeting.meeting_id}?pwd=${meeting.password}`;
        window.open(zoomUrl, `_blank_${index}`);
      }, index * 300);
    });
  };

  const getFilteredMeetings = () => {
    if (!searchQuery.trim()) return meetings;

    const query = searchQuery.toLowerCase();
    return meetings.filter(m =>
      m.meeting_name.toLowerCase().includes(query) ||
      m.meeting_id.toLowerCase().includes(query) ||
      m.password.toLowerCase().includes(query)
    );
  };

  const handleGenerateInvoice = async (includeScreenshots: boolean) => {
    try {
      setShowInvoiceModal(false);

      const { data: lastPayment } = await supabase
        .from('payments')
        .select('payment_date')
        .eq('client_name', user?.name)
        .eq('status', 'approved')
        .order('payment_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      let fromDate: string;
      if (lastPayment?.payment_date) {
        const nextDay = new Date(lastPayment.payment_date);
        nextDay.setDate(nextDay.getDate() + 1);
        fromDate = nextDay.toISOString().split('T')[0];
      } else {
        const { data: firstMeeting } = await supabase
          .from('meetings')
          .select('scheduled_date')
          .eq('client_name', user?.name)
          .order('scheduled_date', { ascending: true })
          .limit(1)
          .maybeSingle();

        fromDate = firstMeeting?.scheduled_date || '2024-01-01';
      }

      const toDate = new Date().toISOString().split('T')[0];

      // Fetch own meetings
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings')
        .select('*')
        .eq('client_name', user?.name)
        .gte('scheduled_date', fromDate)
        .lte('scheduled_date', toDate)
        .order('scheduled_date', { ascending: true});

      if (meetingsError) throw meetingsError;

      let validMeetings = meetingsData || [];

      // If cohost, also fetch sub-client meetings
      if (isCohost) {
        const { data: subClients } = await supabase
          .from('users')
          .select('id, name')
          .eq('parent_user_id', user?.id)
          .eq('role', 'client');

        if (subClients && subClients.length > 0) {
          const subClientIds = subClients.map(c => c.id);

          const { data: subMeetingsData } = await supabase
            .from('meetings')
            .select('*')
            .in('client_id', subClientIds)
            .gte('scheduled_date', fromDate)
            .lte('scheduled_date', toDate)
            .order('scheduled_date', { ascending: true });

          if (subMeetingsData) {
            // Add sub-client info to meetings
            const subMeetingsWithPrefix = subMeetingsData.map(m => {
              const subClient = subClients.find(c => c.id === m.client_id);
              const cleanName = subClient?.name?.replace(cohostPrefix + '-', '') || m.client_name;
              return {
                ...m,
                meeting_name: `# ${cleanName} - ${m.meeting_name}`,
                is_sub_client: true
              };
            });
            validMeetings = [...validMeetings, ...subMeetingsWithPrefix];
          }
        }
      }

      if (validMeetings.length === 0) {
        alert('No meetings found since last payment.');
        return;
      }

      const { data: adjustmentsData } = await supabase
        .from('due_adjustments')
        .select('*')
        .eq('client_name', user?.name)
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: true });

      const adjustments = (adjustmentsData || []).map(adj => ({
        date: adj.date,
        reason: adj.reason,
        amount: Number(adj.amount),
        adminNote: adj.reason
      }));

      const meetings = validMeetings.map(m => {
        const rate = m.member_type === 'dp' ? pricePerDpMember :
                     m.member_type === 'foreigners' ? pricePerForeignMember :
                     pricePerMember;
        const amount = (m.member_count || 0) * rate;
        return {
          date: m.scheduled_date || m.created_at,
          meetingName: m.meeting_name,
          members: m.member_count || 0,
          memberType: m.member_type || 'indian',
          rate: rate,
          amount: amount,
          status: m.status,
          screenshotUrl: m.screenshot_url
        };
      });

      const totalDpMembers = meetings
        .filter(m => m.memberType === 'dp')
        .reduce((sum, m) => sum + m.members, 0);

      const totalForeignMembers = meetings
        .filter(m => m.memberType === 'foreigners')
        .reduce((sum, m) => sum + m.members, 0);

      const subtotal = meetings.reduce((sum, m) => sum + m.amount, 0);
      const adjustmentTotal = adjustments.reduce((sum, a) => sum + a.amount, 0);
      const netAmount = subtotal + adjustmentTotal;

      const { generateClientInvoicePDF } = await import('../utils/pdfGenerator');

      const companyName = parentUserName ? `${parentUserName.toUpperCase()} MEETINGS` : 'JUNAID MEETINGS';

      generateClientInvoicePDF({
        invoiceNumber: Math.floor(Math.random() * 10000),
        clientName: user?.name,
        companyName: companyName,
        fromDate,
        toDate,
        invoiceDate: new Date().toISOString(),
        meetings,
        adjustments,
        totalMeetings: meetings.length,
        totalMembers: meetings.reduce((sum, m) => sum + m.members, 0),
        totalDpMembers,
        totalForeignMembers,
        subtotal,
        adjustmentTotal,
        netAmount,
        lastPaymentDate: lastPayment?.payment_date,
        includeScreenshots
      });
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice. Please try again.');
    }
  };

  const handleWhatsAppShare = async (meeting: Meeting) => {
    if (!meeting.screenshot_url) return;

    const message = `Meeting Name - ${meeting.meeting_name}\n\n*Participants added successfully - ${meeting.member_count}*`;

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile && navigator.share) {
      try {
        const response = await fetch(meeting.screenshot_url);
        const blob = await response.blob();
        const file = new File([blob], `${meeting.meeting_name}.png`, { type: 'image/png' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: meeting.meeting_name,
            text: message
          });
          return;
        }
      } catch (error) {
        console.error('Native share failed:', error);
      }
    }

    downloadAndShareImage(meeting);
  };

  const fetchMeetings = async (rate?: number, forceIsCohost?: boolean) => {
    if (isLoadingMeetings) return;

    const isCohostUser = forceIsCohost !== undefined ? forceIsCohost : isCohost;
    setIsLoadingMeetings(true);
    const selectedDateStr = new Date(selectedDate).toISOString().split('T')[0];

    try {
      const startOfDay = `${selectedDateStr}T00:00:00`;
      const endOfDay = `${selectedDateStr}T23:59:59`;

      let allMeetings: any[] = [];

      const scheduledOwn = await supabase
        .from('meetings')
        .select('*')
        .eq('scheduled_date', selectedDateStr)
        .eq('client_name', user?.name)
        .order('created_at', { ascending: false });

      const instantOwn = await supabase
        .from('meetings')
        .select('*')
        .is('scheduled_date', null)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .eq('client_name', user?.name)
        .order('created_at', { ascending: false });

      allMeetings = [
        ...(scheduledOwn.data || []),
        ...(instantOwn.data || [])
      ];

      if (isCohostUser) {
        const { data: subClientsData } = await supabase
          .from('users')
          .select('id, name')
          .eq('parent_user_id', user?.id)
          .eq('role', 'client');

        const subClientIds = subClientsData?.map(s => s.id) || [];

        if (subClientIds.length > 0) {
          const scheduledSubClient = await supabase
            .from('meetings')
            .select('*')
            .eq('scheduled_date', selectedDateStr)
            .in('client_id', subClientIds)
            .order('created_at', { ascending: false });

          const instantSubClient = await supabase
            .from('meetings')
            .select('*')
            .is('scheduled_date', null)
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay)
            .in('client_id', subClientIds)
            .order('created_at', { ascending: false });

          const subClientMeetingsData = [
            ...(scheduledSubClient.data || []),
            ...(instantSubClient.data || [])
          ].map(m => ({
            ...m,
            is_subclient: true,
            cohost_id: user?.id
          }));

          allMeetings = [
            ...allMeetings,
            ...subClientMeetingsData
          ];
        }
      }

      const data = allMeetings;
      const error = scheduledOwn.error || instantOwn.error;

      if (!error && data) {
        let filteredData = data.map(m => {
          let displayLabel = '';
          const isSubClientMeeting = m.is_subclient === true || (m.cohost_id === user?.id && m.client_name !== user?.name);

          if (isCohostUser) {
            if (m.client_name === user?.name) {
              displayLabel = 'SELF';
            } else if (isSubClientMeeting) {
              displayLabel = `SUB CLIENT: ${m.client_name}`;
            } else {
              displayLabel = m.client_name;
            }
          } else {
            displayLabel = m.client_name === user?.name ? 'Me' : m.client_name;
          }

          return {
            ...m,
            display_name: displayLabel,
            is_subclient_meeting: isSubClientMeeting
          };
        });

        const today = new Date().toISOString().split('T')[0];
        const { data: blockedStatus } = await supabase
          .from('users')
          .select('is_blocked')
          .eq('id', user?.id)
          .maybeSingle();

        if (blockedStatus?.is_blocked === true && selectedDateStr >= today) {
          filteredData = filteredData.filter(m => m.client_name !== user?.name);
        }

        if (isCohostUser) {
          filteredData.sort((a, b) => {
            if (a.is_subclient_meeting && !b.is_subclient_meeting) return -1;
            if (!a.is_subclient_meeting && b.is_subclient_meeting) return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
        }

        setMeetings(filteredData);

        setMeetingsCache(prev => ({
          ...prev,
          [selectedDateStr]: filteredData
        }));

        const currentRate = rate !== undefined ? rate : pricePerMember;
        calculateDailyNetDue(filteredData, currentRate, selectedDate);
      }
    } finally {
      setIsLoadingMeetings(false);
    }
  };

  const fetchRecurringMeetings = async () => {
    const { data, error } = await supabase
      .from('recurring_meeting_templates')
      .select('*')
      .eq('client_id', user?.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRecurringMeetings(data);
    }
  };

  const fetchSubClientMeetings = async () => {
    if (!isCohost) return;

    const { data: subClients } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('parent_user_id', user?.id)
      .eq('role', 'client')
      .not('name', 'like', '[DELETED]%');

    if (subClients && subClients.length > 0) {
      const subClientIds = subClients.map(c => c.id);
      const startOfDay = `${selectedDate}T00:00:00Z`;
      const endOfDay = `${selectedDate}T23:59:59.999Z`;

      const [scheduledResult, instantResult] = await Promise.all([
        supabase
          .from('meetings')
          .select('*')
          .in('client_id', subClientIds)
          .eq('scheduled_date', selectedDate)
          .order('created_at', { ascending: false }),
        supabase
          .from('meetings')
          .select('*')
          .in('client_id', subClientIds)
          .is('scheduled_date', null)
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay)
          .order('created_at', { ascending: false })
      ]);

      const allMeetings = [
        ...(scheduledResult.data || []),
        ...(instantResult.data || [])
      ].filter((m, idx, arr) => arr.findIndex(x => x.id === m.id) === idx);

      const meetingsWithClientNames = allMeetings.map(m => {
        const client = subClients.find(c => c.id === m.client_id);
        return {
          ...m,
          client_name: client?.name || m.client_name
        };
      });
      setSubClientMeetings(meetingsWithClientNames);
    } else {
      setSubClientMeetings([]);
    }
  };


  const removeFromDailyList = async (id: string) => {
    if (!confirm('⚠️ This will remove this meeting from daily recurring list.\n\nAll FUTURE meetings (from today onwards) will be deleted.\nPast meetings will remain untouched.\n\nContinue?')) return;

    const { data, error } = await supabase
      .rpc('remove_recurring_meeting', { p_recurring_id: id });

    if (error) {
      alert('Error removing from daily list: ' + error.message);
      return;
    }

    const deletedCount = data || 0;
    alert(`✅ Removed from daily list! ${deletedCount} future meeting(s) deleted.`);
    fetchRecurringMeetings();
    fetchMeetings(pricePerMember);
  };

  const fetchDatabaseNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (data) {
      const formattedNotifications = data.map(n => ({
        id: n.id,
        message: n.message,
        time: new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        read: n.is_read,
        type: (n.type === 'success' || n.type === 'error') ? ('payment' as const) : ('screenshot' as const)
      }));
      setNotifications(formattedNotifications);
      setUnreadCount(formattedNotifications.filter(n => !n.read).length);
    }
  };

  const fetchDailyDues = async () => {
    const { data: subclients } = await supabase
      .from('users')
      .select('id, name')
      .eq('parent_user_id', user?.id)
      .eq('role', 'client');

    const subclientNames = subclients?.map(s => s.name) || [];
    const subclientIds = subclients?.map(s => s.id) || [];

    const { data: ownDues, error } = await supabase
      .from('daily_dues')
      .select('*')
      .eq('client_name', user?.name)
      .order('date', { ascending: false });

    const myPricePerMember = Number(user?.price_per_member) || 1;
    const myDpRate = Number(user?.dp_member_price) || Number(user?.price_per_dp_member) || myPricePerMember;

    let subclientDuesMap: Record<string, { date: string; members: number; amount: number }> = {};

    if (subclientIds.length > 0) {
      const { data: subclientMeetings } = await supabase
        .from('meetings')
        .select('client_name, scheduled_date, member_count, member_type, status')
        .in('client_name', subclientNames)
        .or('status.is.null,status.eq.attended,status.eq.screenshot_uploaded,status.eq.active');

      if (subclientMeetings) {
        const todayStr = new Date().toISOString().split('T')[0];
        for (const meeting of subclientMeetings) {
          const date = meeting.scheduled_date;
          if (!date) continue;

          if (date === todayStr && meeting.status === 'active') {
            continue;
          }

          const key = `${meeting.client_name}_${date}`;
          const members = meeting.member_count || 0;
          const rate = meeting.member_type === 'dp' ? myDpRate : myPricePerMember;
          const costAmount = members * rate;

          if (!subclientDuesMap[key]) {
            subclientDuesMap[key] = { date, members: 0, amount: 0 };
          }
          subclientDuesMap[key].members += members;
          subclientDuesMap[key].amount += costAmount;
        }
      }
    }

    const subclientDuesArray = Object.entries(subclientDuesMap).map(([key, val]) => ({
      id: key,
      client_name: key.split('_')[0],
      date: val.date,
      amount: val.amount,
      meeting_count: 1,
      is_subclient: true
    }));

    const allDues = [...(ownDues || []), ...subclientDuesArray].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (!error) {
      const { data: approvedPayments } = await supabase
        .from('payments')
        .select('amount, payment_upto_date')
        .eq('client_id', user?.id)
        .eq('status', 'approved')
        .order('payment_upto_date', { ascending: false });

      const { data: rejectedPayments } = await supabase
        .from('payments')
        .select('rejected_amount')
        .eq('client_id', user?.id)
        .eq('status', 'rejected');

      const { data: adjustmentsData } = await supabase
        .from('due_adjustments')
        .select('*')
        .eq('client_id', user?.id)
        .order('date', { ascending: false });

      if (adjustmentsData) {
        setAdjustments(adjustmentsData);
      }

      let paymentSettledDate: string | null = null;
      if (approvedPayments && approvedPayments.length > 0) {
        paymentSettledDate = approvedPayments[0].payment_upto_date;
        setPaymentSettledTill(paymentSettledDate);
      } else {
        setPaymentSettledTill(null);
      }

      const unsettledDues = paymentSettledDate
        ? allDues.filter(d => d.date > paymentSettledDate)
        : allDues;

      setDailyDues(unsettledDues);

      const totalRejected = rejectedPayments?.reduce((sum, p) => sum + (p.rejected_amount || 0), 0) || 0;
      const totalDue = unsettledDues.reduce((sum, d) => sum + Number(d.amount), 0);

      setTotalNetDue(totalDue + totalRejected);

      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istTime = new Date(now.getTime() + istOffset);
      const istHour = istTime.getUTCHours();
      const istMinute = istTime.getUTCMinutes();
      const isPast930PM = istHour > 21 || (istHour === 21 && istMinute >= 30);

      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(new Date(today).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const cutoffDate = isPast930PM ? today : yesterday;
      const duesTillToday = unsettledDues.filter(d => d.date <= cutoffDate);
      const totalDueTillToday = duesTillToday.reduce((sum, d) => sum + Number(d.amount), 0);

      setTotalNetDueTillToday(totalDueTillToday + totalRejected);
    }
  };

  const fetchMyPayments = async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('client_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMyPayments(data);
    }
  };

  const fetchPaymentMethods = async () => {
    const cohostId = user?.parent_user_id;

    let data = null;

    if (cohostId) {
      const result = await supabase
        .from('payment_methods')
        .select('*')
        .eq('cohost_user_id', cohostId)
        .maybeSingle();
      data = result.data;

      const { data: cohostUser } = await supabase
        .from('users')
        .select('name')
        .eq('id', cohostId)
        .maybeSingle();
      if (cohostUser) {
        setParentCohostName(cohostUser.name);
      }

      if (data) {
        setCohostPaymentMethods({
          upi_id: data.upi_id,
          qr_code_url: data.qr_code_url,
          usdt_bep20_address: data.usdt_bep20_address,
          usdt_trc20_address: data.usdt_trc20_address
        });
      }
    } else {
      const result = await supabase
        .from('payment_methods')
        .select('*')
        .is('cohost_user_id', null)
        .maybeSingle();
      data = result.data;
    }

    if (data) {
      setUpiId(data.upi_id || '');
      setUsdtAddress(data.usdt_address || data.usdt_trc20_address || data.usdt_bep20_address || '');
      setUsdtNetwork(data.usdt_network || 'TRC20');
      setQrCodeUrl(data.qr_code_url || '');
    }
  };

  const handleSubClientPaymentSubmit = async () => {
    if (!subClientPaymentAmount || parseFloat(subClientPaymentAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!subClientPaymentScreenshot) {
      alert('Please upload payment screenshot');
      return;
    }

    setSubClientPaymentSubmitting(true);

    try {
      const fileExt = subClientPaymentScreenshot.name.split('.').pop();
      const fileName = `payments/${user.id}-payment-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('meeting-screenshots')
        .upload(fileName, subClientPaymentScreenshot, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload screenshot: ' + uploadError.message);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('meeting-screenshots')
        .getPublicUrl(fileName);

      const screenshotUrl = publicUrl || `screenshots/${fileName}`;

      const { error: insertError } = await supabase
        .from('payment_receiving')
        .insert({
          client_id: user.id,
          client_name: user.name,
          amount: parseFloat(subClientPaymentAmount),
          payment_date: new Date().toISOString().split('T')[0],
          screenshot_url: screenshotUrl,
          status: 'pending'
        });

      if (insertError) throw insertError;

      alert('Payment submitted successfully! Your co-host will review and approve it.');
      setShowSubClientPayModal(false);
      setSubClientPaymentAmount('');
      setSubClientPaymentScreenshot(null);
    } catch (error: any) {
      alert('Error submitting payment: ' + error.message);
    } finally {
      setSubClientPaymentSubmitting(false);
    }
  };

  const fetchUserData = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('price_per_member, price_per_foreign_member, price_per_dp_member')
      .eq('id', user?.id)
      .maybeSingle();

    if (!error && data) {
      const rate = data.price_per_member || 0;
      const foreignRate = data.price_per_foreign_member || data.price_per_member || 0;
      const dpRate = data.price_per_dp_member || 240;
      setPricePerMember(rate);
      setPricePerForeignMember(foreignRate);
      setPricePerDpMember(dpRate);
      return rate;
    }
    return 0;
  };

  const calculateDailyNetDue = (meetingsData: Meeting[], rate: number, dateStr: string) => {
    const targetMeetings = meetingsData.filter(m => {
      const meetingDate = (m as any).scheduled_date || new Date(m.created_at).toISOString().split('T')[0];
      const hasScreenshot = m.screenshot_url && m.screenshot_url !== '';
      return meetingDate === dateStr && m.status !== 'not_live' && hasScreenshot;
    });

    const netDue = targetMeetings.reduce((sum, m) => {
      const members = m.member_count || 0;
      const memberType = (m as any).member_type;
      let rateToUse = rate;
      if (memberType === 'dp') {
        rateToUse = pricePerDpMember;
      } else if (memberType === 'foreigners') {
        rateToUse = pricePerForeignMember;
      }
      return sum + (members * rateToUse);
    }, 0);

    setDailyNetDue(netDue);
  };

  const deleteMeeting = async (meetingId: string) => {
    const meeting = meetings.find(m => m.id === meetingId);

    if (meeting?.screenshot_url && meeting.screenshot_url !== '') {
      alert('Cannot delete meeting with screenshot. Please contact admin.');
      return;
    }

    if (!confirm('Are you sure you want to delete this meeting?')) {
      return;
    }

    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', meetingId);

    if (error) {
      alert('Failed to delete meeting: ' + error.message);
      fetchMeetings();
    } else {
      setMeetings(prev => prev.filter(m => m.id !== meetingId));

      if (meeting?.scheduled_date && meeting?.client_name) {
        await supabase.rpc('calculate_daily_dues_for_client', {
          p_client_name: meeting.client_name,
          p_date: meeting.scheduled_date
        });
      }

      fetchMeetings();
    }
  };

  const handlePaymentUpload = async () => {
    if (!paymentScreenshot) {
      alert('Please select a payment screenshot');
      return;
    }

    if (!paymentUptoDate) {
      alert('Please select payment upto date');
      return;
    }

    const paymentAmount = dailyDues
      .filter(due => due.date <= paymentUptoDate)
      .reduce((sum, due) => sum + Number(due.amount), 0);

    if (paymentAmount <= 0) {
      alert('No dues to pay upto the selected date');
      return;
    }

    const existingPendingPayments = myPayments.filter(p => p.status === 'pending').length;
    if (existingPendingPayments > 0) {
      const confirmAdd = window.confirm(
        `You have ${existingPendingPayments} pending payment screenshot(s) already uploaded. Do you want to add another screenshot?`
      );
      if (!confirmAdd) return;
    }

    try {
      const fileExt = paymentScreenshot.name.split('.').pop();
      const fileName = `payment-${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `payments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('meeting-screenshots')
        .upload(filePath, paymentScreenshot);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('meeting-screenshots')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('payment_receiving')
        .insert([{
          client_id: user?.id,
          client_name: user?.name,
          amount: paymentAmount,
          screenshot_url: publicUrl,
          payment_date: new Date().toISOString().split('T')[0],
          status: 'pending'
        }]);

      if (insertError) throw insertError;

      await supabase
        .from('notifications')
        .insert({
          user_id: null,
          message: `New payment received from ${user?.name} for ₹${paymentAmount}`,
          type: 'info'
        });

      alert('Payment screenshot uploaded successfully! Waiting for admin approval.');
      setPaymentScreenshot(null);
      setPaymentUptoDate('');
      await fetchMyPayments();
      await fetchDailyDues();
    } catch (error: any) {
      alert('Error uploading payment: ' + error.message);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this payment screenshot?');
    if (!confirmDelete) return;

    setMyPayments(prev => prev.filter(p => p.id !== paymentId));

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      alert('Payment screenshot deleted successfully!');
    } catch (error: any) {
      alert('Error deleting payment: ' + error.message);
      await fetchMyPayments();
    }
  };

  const dismissWarning = async () => {
    setShowWarning(false);

    const { data: notification } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'warning')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (notification) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);
    }
  };

  const fetchPreviousMeetings = async () => {
    const { data, error } = await supabase
      .from('meetings')
      .select('meeting_name, meeting_id, password, hour, minutes, time_period, member_count')
      .eq('client_name', user?.name)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      const uniqueMeetings = data.reduce((acc: Meeting[], curr) => {
        if (!acc.find(m =>
          m.meeting_id === curr.meeting_id &&
          m.password === curr.password
        )) {
          acc.push(curr as Meeting);
        }
        return acc;
      }, []);
      setPreviousMeetings(uniqueMeetings);
    }
  };

  useEffect(() => {
    const welcomeTimer = setTimeout(() => {
      setShowWelcome(false);
    }, 3000);
    return () => clearTimeout(welcomeTimer);
  }, []);

  useEffect(() => {
    const checkPaymentMethodWarning = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'warning')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && data.message.includes('PAYMENT METHODS UPDATED')) {
        setPaymentMethodWarning(data.message);
        setShowWarning(true);
      }
    };

    checkPaymentMethodWarning();

    const subscription = supabase
      .channel('payment_warning_updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload: any) => {
        if (payload.new.type === 'warning' && payload.new.message.includes('PAYMENT METHODS UPDATED')) {
          setPaymentMethodWarning(payload.new.message);
          setShowWarning(true);
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user.id]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (selectedDate === today) {
      setDateLabel('Today');
    } else {
      const date = new Date(selectedDate);
      setDateLabel(date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }));
    }
  }, [selectedDate]);

  useEffect(() => {
    const fetchCohostRequestStatus = async () => {
      const { data } = await supabase
        .from('cohost_requests')
        .select('status')
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setCohostRequestStatus(data.status);
      }
    };

    fetchCohostRequestStatus();
  }, [user.id]);

  useEffect(() => {
    const fetchCohostData = async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('is_cohost, cohost_prefix, parent_user_id, cohost_rate')
        .eq('id', user.id)
        .maybeSingle();

      if (userData) {
        setIsCohost(userData.is_cohost || false);
        setCohostRate(Number(userData.cohost_rate) || 1);
        setParentUserId(userData.parent_user_id || null);
        setCohostPrefix(userData.cohost_prefix || '');
        setIsSubClient(!!userData.parent_user_id && !userData.is_cohost);

        if (userData.parent_user_id) {
          const { data: parentUser } = await supabase
            .from('users')
            .select('name')
            .eq('id', userData.parent_user_id)
            .maybeSingle();

          if (parentUser) {
            setParentUserName(parentUser.name);
          }
        }

        if (userData.is_cohost) {
          const { data: clients } = await supabase
            .from('users')
            .select('id, name, email, created_at, is_blocked')
            .eq('parent_user_id', user.id)
            .not('name', 'like', '[DELETED]%')
            .order('created_at', { ascending: false });

          setMyClients(clients || []);
        }

        setCohostStatusLoaded(true);
        setMeetingsCache({});
        await fetchMeetings(pricePerMember, userData.is_cohost || false);
      } else {
        setCohostStatusLoaded(true);
        await fetchMeetings(pricePerMember, false);
      }
    };

    fetchCohostData();
  }, [user.id]);

  useEffect(() => {
    if (cohostStatusLoaded) {
      fetchMeetings(undefined, isCohost);
    }
  }, [selectedDate]);

  const handleRequestCohost = async () => {
    if (cohostRequestStatus === 'pending') {
      alert('You already have a pending request!');
      return;
    }

    if (!confirm('Request to become a Co-Host? You will be able to manage your own clients.')) {
      return;
    }

    const { error } = await supabase
      .from('cohost_requests')
      .insert({
        user_id: user.id,
        status: 'pending'
      });

    if (error) {
      alert('Error submitting request: ' + error.message);
    } else {
      alert('Request submitted successfully! Admin will review it soon.');
      setCohostRequestStatus('pending');
    }
  };

  useEffect(() => {
    const checkLoginStatus = async () => {
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'login_restricted')
        .maybeSingle();

      if (settingsData?.setting_value === 'true') {
        onLogout();
      }

      const { data: userData } = await supabase
        .from('users')
        .select('is_blocked')
        .eq('id', user?.id)
        .maybeSingle();

      if (userData?.is_blocked === true) {
        onLogout();
      } else {
        setIsUserBlocked(userData?.is_blocked || false);
      }
    };

    checkLoginStatus();
    const statusInterval = setInterval(checkLoginStatus, 5000);

    const channel = supabase
      .channel('system_settings_client_check')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_settings',
          filter: 'setting_key=eq.login_restricted'
        },
        (payload: any) => {
          if (payload.new.setting_value === 'true') {
            onLogout();
          }
        }
      )
      .subscribe();

    const userChannel = supabase
      .channel('user_blocked_check')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user?.id}`
        },
        (payload: any) => {
          if (payload.new.is_blocked === true) {
            onLogout();
          } else {
            setIsUserBlocked(payload.new.is_blocked || false);
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(statusInterval);
      channel.unsubscribe();
      userChannel.unsubscribe();
    };
  }, [onLogout, user?.id]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: createResult, error: createError } = await supabase.rpc('ensure_client_recurring_meetings', {
          p_client_name: user?.name
        });
        if (createError) {
          console.error('⚠️ Failed to auto-create recurring meetings:', createError);
        } else if (createResult && createResult > 0) {
          console.log(`✅ Auto-created ${createResult} recurring meeting(s) for today`);
        }
      } catch (err) {
        console.error('⚠️ Error calling ensure_client_recurring_meetings:', err);
      }

      const rate = await fetchUserData();
      await fetchMeetings(rate);
      await fetchPreviousMeetings();
      await fetchMyPayments();
      await fetchPaymentMethods();
      await fetchDailyDues();
      await fetchDatabaseNotifications();
      await fetchRecurringMeetings();
      if (isCohost) {
        await fetchSubClientMeetings();
      }
    };
    loadData();

    const sessionId = localStorage.getItem('client_session_id');
    const updateActivity = async () => {
      if (sessionId) {
        await supabase
          .from('user_sessions')
          .update({ last_activity: new Date().toISOString() })
          .eq('id', sessionId)
          .eq('is_active', true);
      }
    };

    updateActivity();
    const activityInterval = setInterval(updateActivity, 60000);

    const paymentMethodsSub = supabase
      .channel('client_payment_methods_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_methods' }, (payload) => {
        console.log('Client: Payment methods changed', payload);
        fetchPaymentMethods();
      })
      .subscribe();

    const notificationsSub = supabase
      .channel('client_notifications_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user?.id}` }, (payload) => {
        console.log('Client: Notification received', payload);
        fetchDatabaseNotifications();
        if (payload.eventType === 'INSERT' && !payload.new.is_read) {
          playNotificationSound();
        }
      })
      .subscribe();

    const paymentsSub = supabase
      .channel('client_payments_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `client_id=eq.${user?.id}` }, (payload) => {
        console.log('Client: Payment status changed', payload);
        setTimeout(() => {
          fetchMyPayments();
          fetchDailyDues();
        }, 500);
      })
      .subscribe();

    const dailyDuesSub = supabase
      .channel('client_daily_dues_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_dues', filter: `client_id=eq.${user?.id}` }, (payload) => {
        console.log('Client: Daily dues changed', payload);
        setTimeout(() => {
          fetchDailyDues();
        }, 500);
      })
      .subscribe();

    const allDuesSub = supabase
      .channel('all_daily_dues_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_dues' }, (payload) => {
        console.log('Client: Any daily dues changed', payload);
        if (isCohost) {
          setTimeout(() => {
            fetchTodayProfitData();
            fetchDailyDues();
          }, 500);
        }
      })
      .subscribe();

    return () => {
      clearInterval(activityInterval);
      paymentMethodsSub.unsubscribe();
      notificationsSub.unsubscribe();
      paymentsSub.unsubscribe();
      dailyDuesSub.unsubscribe();
      allDuesSub.unsubscribe();
    };
  }, [selectedDate]);

  useEffect(() => {
    const oldLoadData = async () => {
      const rate = await fetchUserData();
      await fetchMeetings(rate);
      await fetchPreviousMeetings();
      await fetchMyPayments();
      await fetchPaymentMethods();
    };
    oldLoadData();

    const subscription = supabase
      .channel(`client_meetings_${user?.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, (payload: any) => {
        console.log('Client: Meeting change detected', payload);

        if (payload.eventType === 'UPDATE' && payload.new) {
          const updatedMeeting = payload.new;
          const meetingDate = updatedMeeting.scheduled_date || new Date(updatedMeeting.created_at).toISOString().split('T')[0];
          const today = new Date().toISOString().split('T')[0];

          if (meetingDate === today && updatedMeeting.client_name === user?.name) {
            setMeetings(prev => {
              const updated = prev.map(m => m.id === updatedMeeting.id ? { ...m, ...updatedMeeting } : m);
              const todayMeetings = updated.filter(m => {
                const mDate = (m as any).scheduled_date || new Date(m.created_at).toISOString().split('T')[0];
                return mDate === today && m.client_name === user?.name && m.status !== 'not_live' && m.screenshot_url;
              });
              const due = todayMeetings.reduce((sum, m) => {
                const members = m.member_count || 0;
                const memberType = (m as any).member_type;
                let rate = pricePerMember;
                if (memberType === 'dp') rate = pricePerDpMember;
                else if (memberType === 'foreigners') rate = pricePerForeignMember;
                return sum + (members * rate);
              }, 0);
              setDailyNetDue(due);
              return updated;
            });
          }

          if (updatedMeeting.screenshot_url && updatedMeeting.client_name === user?.name) {
            setScreenshotNotification(updatedMeeting.meeting_name);
            setTimeout(() => setScreenshotNotification(null), 5000);

            const newNotification = {
              id: `screenshot-${updatedMeeting.id}-${Date.now()}`,
              message: `Screenshot uploaded for ${updatedMeeting.meeting_name}`,
              time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
              read: false,
              type: 'screenshot' as const
            };
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            playNotificationSound();

            setTimeout(() => {
              fetchDailyDues();
            }, 500);
          }

          if (!updatedMeeting.screenshot_url && updatedMeeting.client_name === user?.name) {
            setTimeout(() => {
              fetchDailyDues();
            }, 500);
          }
        } else {
          fetchMeetings();
        }

        if (isCohost) {
          fetchSubClientMeetings();
        }
      })
      .subscribe();

    const paymentMethodsSubscription = supabase
      .channel(`payment_methods_${user?.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_methods' }, (payload) => {
        console.log('Client: Payment methods changed', payload);
        fetchPaymentMethods();
      })
      .subscribe();

    const userRateSubscription = supabase
      .channel(`user_rate_${user?.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, async (payload: any) => {
        console.log('Client: Rate changed', payload);
        if (payload.new && payload.new.name === user?.name) {
          const newRate = payload.new.price_per_member;
          const newForeignRate = payload.new.price_per_foreign_member || payload.new.price_per_member;
          setPricePerMember(newRate);
          setPricePerForeignMember(newForeignRate);
          setPricePerDpMember(payload.new.price_per_dp_member || 240);
          await fetchMeetings(newRate);
          await fetchDailyDues();
        }
      })
      .subscribe();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.meeting-name-input')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      subscription.unsubscribe();
      paymentMethodsSubscription.unsubscribe();
      userRateSubscription.unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user?.name]);

  useEffect(() => {
    const clockInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      const istHours = now.getHours();
      const istMinutes = now.getMinutes();

      if (istHours === 0 && istMinutes === 0) {
        const newDate = now.toISOString().split('T')[0];
        setSelectedDate(newDate);
        setNotifications([]);
        setUnreadCount(0);
      }
    }, 1000);

    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    const selectedDateMeetings = meetings.filter(m => {
      const meetingDate = (m as any).scheduled_date || new Date(m.created_at).toISOString().split('T')[0];
      return meetingDate === selectedDate && !m.attended;
    });
    const totalPayment = selectedDateMeetings.reduce((sum, m) => sum + calculateMeetingPayment(m), 0);
    const totalMembers = selectedDateMeetings.reduce((sum, m) => sum + (m.member_count || 0), 0);
    setTodayEstimatePayment(totalPayment);
    setTodayTotalMembers(totalMembers);
  }, [meetings, selectedDate, pricePerMember, pricePerForeignMember]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];

    if (myPayments && myPayments.length > 0) {
      const todayPaymentsTotal = myPayments
        .filter(p => p.payment_date === today && p.approved_by_admin)
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      setTodayIncome(todayPaymentsTotal);
    }

    if (dailyDues && dailyDues.length > 0) {
      const duesToday = dailyDues.filter(d => d.date <= today);
      const totalDuesTillToday = duesToday.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
      setNetDueTillToday(totalDuesTillToday);
    }
  }, [myPayments, dailyDues]);

  const filteredSuggestions = meetingName
    ? previousMeetings.filter(m =>
        m.meeting_name.toLowerCase().includes(meetingName.toLowerCase())
      )
    : previousMeetings.slice(0, 10);

  const selectSuggestion = (meeting: Meeting) => {
    setMeetingName(meeting.meeting_name);
    setMeetingId(meeting.meeting_id);
    setPassword(meeting.password);
    setHour(meeting.hour || 8);
    setMinutes(meeting.minutes || 0);
    setTimePeriod(meeting.time_period || 'PM');
    setMemberCount(meeting.member_count || 1);
    setShowSuggestions(false);
  };

  const handleNotificationClick = (notification: any) => {
    if (notification.metadata?.screenshot_url) {
      setSelectedScreenshot(notification.metadata.screenshot_url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!meetingName.trim() || !meetingId.trim() || !password.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    const cleanMeetingId = meetingId.replace(/\s/g, '');
    const cleanPassword = password.replace(/\s/g, '');

    const targetDate = scheduledDate || selectedDate;
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: existingMeetings, error: checkError } = await supabase
      .from('meetings')
      .select('id, meeting_id, meeting_name, hour, minutes, time_period, member_count')
      .eq('client_name', user?.name)
      .eq('meeting_id', cleanMeetingId)
      .or(`and(scheduled_date.gte.${targetDate},scheduled_date.lte.${targetDate}),and(scheduled_date.is.null,created_at.gte.${startOfDay.toISOString()},created_at.lte.${endOfDay.toISOString()})`);

    if (checkError) {
      console.error('Error checking duplicates:', checkError);
    }

    if (existingMeetings && existingMeetings.length > 0) {
      const duplicateWithSameMemberCount = existingMeetings.find(existing => {
        return existing.member_count === memberCount;
      });

      if (duplicateWithSameMemberCount) {
        const existingTime = `${duplicateWithSameMemberCount.hour}:${String(duplicateWithSameMemberCount.minutes).padStart(2, '0')} ${duplicateWithSameMemberCount.time_period}`;
        const message = `⚠️ Meeting Already Added!\n\nMeeting ID: ${cleanMeetingId}\nMeeting Name: ${duplicateWithSameMemberCount.meeting_name}\nMembers: ${memberCount}\n\nThis meeting with ${memberCount} members is already added for ${scheduledDate ? new Date(scheduledDate).toLocaleDateString('en-IN') : 'today'} at ${existingTime}.\n\nNote: You can add the same meeting with a DIFFERENT member count if needed.`;

        alert(message);
        return;
      }
    }

    const meetingData: any = {
      meeting_name: meetingName,
      meeting_id: cleanMeetingId,
      password: cleanPassword,
      hour: hour,
      minutes: minutes,
      time_period: timePeriod,
      member_count: memberCount,
      member_type: memberType,
      client_id: user?.id,
      client_name: user?.name,
      is_instant: isInstant,
      attended: false
    };

    if (parentUserId) {
      meetingData.cohost_id = parentUserId;
    }

    meetingData.scheduled_date = scheduledDate || selectedDate;

    const { error } = await supabase
      .from('meetings')
      .insert([meetingData]);

    if (error) {
      alert('Error saving meeting: ' + error.message);
      return;
    }

    if (scheduledDate) {
      alert(`✅ Meeting scheduled successfully for ${new Date(scheduledDate).toLocaleDateString('en-IN')}!`);
    } else {
      alert('✅ Meeting added successfully!');
    }

    setMeetingName('');
    setMeetingId('');
    setPassword('');
    setHour(8);
    setMinutes(5);
    setTimePeriod('PM');
    setMemberCount(1);
    setMemberType('indian');
    setIsInstant(false);
    setScheduledDate('');
    fetchMeetings();
    fetchPreviousMeetings();
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDark
        ? 'bg-slate-900'
        : 'bg-slate-50'
    }`}>
      {showWarning && paymentMethodWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center pt-20 px-4 animate-fade-in">
          <div className={`max-w-2xl w-full rounded-3xl shadow-2xl border-4 ${
            isDark
              ? 'bg-gradient-to-br from-red-900/95 via-orange-900/95 to-red-900/95 border-red-500'
              : 'bg-gradient-to-br from-red-50 via-orange-50 to-red-50 border-red-400'
          } p-8 animate-slide-down`}>
            <div className="flex items-start gap-4 mb-6">
              <div className="bg-red-500 rounded-full p-3 animate-pulse">
                <AlertTriangle className="text-white" size={32} />
              </div>
              <div className="flex-1">
                <h2 className={`text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-red-900'}`}>
                  ⚠️ CRITICAL WARNING / गंभीर चेतावनी
                </h2>
                <p className={`text-sm font-bold uppercase tracking-wide ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                  Must Read Before Making Payment / भुगतान करने से पहले अवश्य पढ़ें
                </p>
              </div>
              <button
                onClick={dismissWarning}
                className={`p-2 rounded-xl transition-all duration-200 hover:scale-110 ${
                  isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-red-200 hover:bg-red-300'
                }`}
              >
                <X size={24} className={isDark ? 'text-white' : 'text-red-900'} />
              </button>
            </div>

            <div className={`rounded-2xl p-6 mb-6 ${
              isDark ? 'bg-black/30 border-2 border-red-500/50' : 'bg-white border-2 border-red-300'
            }`}>
              <pre className={`whitespace-pre-wrap font-semibold text-base leading-relaxed ${
                isDark ? 'text-gray-100' : 'text-gray-900'
              }`}>
                {paymentMethodWarning}
              </pre>
            </div>

            <button
              onClick={dismissWarning}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-[1.02] shadow-xl ${
                isDark
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white'
                  : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white'
              }`}
            >
              I Understand / मैं समझता/समझती हूँ
            </button>
          </div>
        </div>
      )}

      {screenshotNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 rounded-xl shadow-2xl px-6 py-3 border border-green-500/50">
            <p className="text-white font-semibold text-sm flex items-center gap-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Screenshot uploaded of {screenshotNotification}
            </p>
          </div>
        </div>
      )}

      <div className="container mx-auto max-w-[1900px] px-4 md:px-6 lg:px-8">
        <div className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-all duration-200 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-4 mb-6 ${
          isDark
            ? 'bg-slate-900/95 border-slate-800'
            : 'bg-white/95 border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {isAdminImpersonating && (
                <button
                  onClick={handleBackToAdmin}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                  title="Back to Admin Panel"
                >
                  <ArrowLeft size={20} />
                  <span className="hidden md:inline">Back to Admin</span>
                </button>
              )}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                  isDark ? 'bg-gradient-to-br from-blue-600 to-cyan-600' : 'bg-gradient-to-br from-blue-600 to-cyan-600'
                }`}>
                  <span className="text-white text-lg font-bold">{user?.name?.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className={`text-xl font-bold tracking-tight ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}>
                      {user?.name || 'Client'}
                    </h1>
                    {isCohost && (
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg">
                        CO-HOST
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Client Dashboard {isCohost && `• Prefix: ${cohostPrefix}`}
                  </p>
                </div>
              </div>
              <div className="hidden lg:flex items-center gap-2">
                <div className={`px-3 py-1.5 rounded-lg border ${
                  isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                    <span className={`font-medium text-xs ${
                      isDark ? 'text-blue-300' : 'text-blue-700'
                    }`}>
                      {new Date().toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
                <div className={`px-3 py-1.5 rounded-lg border ${
                  isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                    <span className={`font-bold text-xs font-mono ${
                      isDark ? 'text-emerald-300' : 'text-emerald-700'
                    }`}>
                      {currentTime.toLocaleTimeString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isDark
                    ? 'hover:bg-slate-800'
                    : 'hover:bg-slate-100'
                }`}
                title="Toggle Theme"
              >
                {isDark ? (
                  <Sun size={18} className="text-slate-400" />
                ) : (
                  <Moon size={18} className="text-slate-600" />
                )}
              </button>
              <button
                onClick={async () => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) {
                    await supabase
                      .from('notifications')
                      .update({ is_read: true })
                      .eq('user_id', user?.id)
                      .eq('is_read', false);

                    setNotifications(prev => prev.map(n => ({...n, read: true})));
                    setUnreadCount(0);
                  }
                }}
                className={`relative p-2 rounded-lg transition-all duration-200 ${
                  showNotifications
                    ? 'bg-blue-600 text-white'
                    : isDark
                    ? 'hover:bg-slate-800 text-slate-400'
                    : 'hover:bg-slate-100 text-slate-600'
                }`}
                title="Notifications"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={showNotifications ? 'text-white' : ''}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowInvoiceModal(true)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isDark
                    ? 'hover:bg-slate-800 text-slate-400'
                    : 'hover:bg-slate-100 text-slate-600'
                }`}
                title="Download Invoice"
              >
                <FileText size={18} />
              </button>
              <button
                onClick={() => setShowCalendar(true)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isDark
                    ? 'hover:bg-slate-800 text-slate-400'
                    : 'hover:bg-slate-100 text-slate-600'
                }`}
                title="View Calendar"
              >
                <Calendar size={18} />
              </button>
              <button
                onClick={async () => {
                  const newPassword = prompt('Enter new password (min 6 characters):');
                  if (newPassword && newPassword.length >= 6) {
                    await supabase
                      .from('users')
                      .update({ password_hash: newPassword })
                      .eq('id', user?.id);
                    alert('Password changed successfully!');
                  } else if (newPassword) {
                    alert('Password must be at least 6 characters');
                  }
                }}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isDark
                    ? 'hover:bg-slate-800 text-slate-400'
                    : 'hover:bg-slate-100 text-slate-600'
                }`}
                title="Change Password"
              >
                <Key size={18} />
              </button>
              <button
                onClick={() => {
                  fetchDailyDues();
                  fetchMyPayments();
                }}
                className={`p-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 ${isDark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'}`}
                title="Refresh Data"
              >
                <RefreshCw size={20} className="text-white" />
              </button>
              {!isSubClient && totalNetDue > 0 && (
                <button
                  onClick={() => {
                    setShowPaymentSection(true);
                    setPaymentView('make-payment');
                  }}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg hover:scale-105 relative"
                  title="Make Payment"
                >
                  <RupeeSymbol size={18} />
                  <span className="hidden md:inline">Pay Dues</span>
                  {totalNetDue > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-6 h-6 px-1.5 flex items-center justify-center shadow-lg border-2 border-white">
                      !
                    </span>
                  )}
                </button>
              )}
              {isSubClient && (
                <button
                  onClick={() => setShowSubClientPayModal(true)}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-2.5 px-5 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 relative animate-pulse hover:animate-none"
                  style={{ boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)' }}
                  title="Pay Dues to Co-Host"
                >
                  <IndianRupee size={18} />
                  <span>Pay Dues</span>
                </button>
              )}
              {!isSubClient && cohostRequestStatus === 'none' && (
                <>
                  <button
                    onClick={handleRequestCohost}
                    className={`px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium ${
                      isDark
                        ? 'bg-blue-600/10 text-blue-400 hover:bg-blue-600/20'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    <Shield size={16} />
                    <span className="hidden md:inline">Request Co-Host</span>
                  </button>
                </>
              )}
              {!isSubClient && cohostRequestStatus === 'pending' && (
                <div className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium ${
                  isDark ? 'bg-yellow-600/10 text-yellow-400' : 'bg-yellow-50 text-yellow-700'
                }`}>
                  <Clock size={16} />
                  <span className="hidden md:inline">Co-Host Pending</span>
                </div>
              )}
              {isCohost && (
                <button
                  onClick={() => setShowCohostDashboard(true)}
                  className={`px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium ${
                    isDark
                      ? 'bg-purple-600/10 text-purple-400 hover:bg-purple-600/20'
                      : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                  }`}
                >
                  <Users size={16} />
                  <span className="hidden md:inline">Client Dashboard ({myClients.length})</span>
                </button>
              )}
              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>
              <button
                onClick={onLogout}
                className={`px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium ${
                  isDark
                    ? 'bg-red-600/10 text-red-400 hover:bg-red-600/20'
                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                }`}
              >
                <LogOut size={16} />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>

        </div>


        {isSubClient && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className={`p-6 rounded-2xl shadow-xl ${isDark ? 'bg-slate-800/80 border border-slate-700' : 'bg-white border border-gray-200'}`}>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Calendar size={24} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                  <p className={`text-lg font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Today's Meetings</p>
                </div>
                <p className={`text-5xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {meetings.filter(m => {
                    const meetingDate = (m as any).scheduled_date || new Date(m.created_at).toISOString().split('T')[0];
                    return meetingDate === selectedDate;
                  }).length}
                </p>
                <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {meetings.filter(m => {
                    const meetingDate = (m as any).scheduled_date || new Date(m.created_at).toISOString().split('T')[0];
                    return meetingDate === selectedDate && m.attended;
                  }).length} billed
                </p>
              </div>
            </div>

            <div className={`p-6 rounded-2xl shadow-xl ${isDark ? 'bg-slate-800/80 border border-slate-700' : 'bg-white border border-gray-200'}`}>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users size={24} className={isDark ? 'text-teal-400' : 'text-teal-600'} />
                  <p className={`text-lg font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Members Today</p>
                </div>
                <p className={`text-5xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {meetings.filter(m => {
                    const meetingDate = (m as any).scheduled_date || new Date(m.created_at).toISOString().split('T')[0];
                    return meetingDate === selectedDate && m.attended;
                  }).reduce((sum, m) => sum + (m.member_count || 0), 0)}
                </p>
                <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Rate: {'\u20B9'}{pricePerMember}/member
                </p>
              </div>
            </div>

            <div className={`p-6 rounded-2xl shadow-xl bg-gradient-to-br ${isDark ? 'from-orange-900/50 to-red-900/50 border border-orange-500/30' : 'from-orange-100 to-red-100 border border-orange-300'}`}>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingDown size={24} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
                  <p className={`text-lg font-bold ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>Net Due Today</p>
                </div>
                <p className={`text-5xl font-black ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                  {'\u20B9'}{dailyNetDue.toFixed(0)}
                </p>
                <p className={`text-sm mt-2 ${isDark ? 'text-orange-300/70' : 'text-orange-600/70'}`}>
                  For today's billed meetings
                </p>
              </div>
            </div>

            <div className={`p-6 rounded-2xl shadow-xl bg-gradient-to-br ${isDark ? 'from-red-900/50 to-rose-900/50 border border-red-500/30' : 'from-red-100 to-rose-100 border border-red-300'}`}>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <IndianRupee size={24} className={isDark ? 'text-red-400' : 'text-red-600'} />
                  <p className={`text-lg font-bold ${isDark ? 'text-red-300' : 'text-red-700'}`}>Total Net Due</p>
                </div>
                <p className={`text-5xl font-black ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                  {'\u20B9'}{totalNetDue.toFixed(0)}
                </p>
                <p className={`text-sm mt-2 ${isDark ? 'text-red-300/70' : 'text-red-600/70'}`}>
                  Total pending payment
                </p>
              </div>
            </div>
          </div>
        )}

        {!isSubClient && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div
              className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 rounded-2xl shadow-2xl p-6 hover:shadow-[0_25px_50px_-12px_rgba(251,146,60,0.5)] transition-all duration-500 hover:scale-[1.02] cursor-pointer"
              onMouseEnter={() => playMoneyCountingSound()}
            >
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <p className="text-sm text-orange-100 font-semibold">Total Members Today</p>
                  <button
                    onClick={() => setShowDueAmount(!showDueAmount)}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-md p-2 rounded-lg transition-all duration-300 border border-white/30 hover:border-white/40 shadow-lg hover:scale-110"
                    title={showDueAmount ? 'Hide Amount' : 'Show Amount'}
                  >
                    {showDueAmount ? (
                      <Eye size={16} className="text-white" />
                    ) : (
                      <EyeOff size={16} className="text-white" />
                    )}
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setShowMemberCount(!showMemberCount)}
                      className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                      title={showMemberCount ? 'Hide Member Count' : 'Show Member Count'}
                    >
                      {showMemberCount ? (
                        <Eye size={16} className="text-white" />
                      ) : (
                        <EyeOff size={16} className="text-white" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <Users className="text-white" size={40} />
                    <p className="text-6xl font-black text-white">
                      {showMemberCount ? meetings.filter(m => {
                        const meetingDate = (m as any).scheduled_date || new Date(m.created_at).toISOString().split('T')[0];
                        return meetingDate === selectedDate && m.attended;
                      }).reduce((sum, m) => sum + (m.member_count || 0), 0) : '•••'}
                    </p>
                  </div>
                </div>
                <div className="my-4 border-t-2 border-white/30"></div>
                <p className="text-sm text-orange-100 font-semibold mb-2">Net Due Today</p>
                <p className="text-5xl font-black text-white">{showDueAmount ? `₹${dailyNetDue.toFixed(2)}` : '₹•••••'}</p>
                <div className="mt-3 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 inline-block shadow-lg">
                  <p className="text-xs text-white font-bold">
                    ₹{pricePerMember.toFixed(2)} per member
                  </p>
                </div>
              </div>
            </div>

            <div
              className="bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 rounded-2xl shadow-2xl p-6 hover:shadow-[0_25px_50px_-12px_rgba(220,38,38,0.5)] transition-all duration-500 hover:scale-[1.02] cursor-pointer"
              onMouseEnter={() => playMoneyCountingSound()}
            >
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <p className="text-lg text-red-100 font-bold">Net Due Till Today</p>
                  <button
                    onClick={() => setShowDueAmount(!showDueAmount)}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-md p-2 rounded-lg transition-all duration-300 border border-white/30 hover:border-white/40 shadow-lg hover:scale-110"
                    title={showDueAmount ? 'Hide Amount' : 'Show Amount'}
                  >
                    {showDueAmount ? (
                      <Eye size={16} className="text-white" />
                    ) : (
                      <EyeOff size={16} className="text-white" />
                    )}
                  </button>
                </div>
                <p className="text-6xl font-black text-white mb-4">{showDueAmount ? `₹${totalNetDue.toFixed(2)}` : '₹•••••'}</p>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 inline-block shadow-lg mb-3">
                  <p className="text-xs text-white font-bold">
                    ₹{pricePerMember.toFixed(2)} per member
                  </p>
                </div>
                <p className="text-sm text-red-100">Accumulated dues</p>
                {paymentSettledTill && (
                  <div className="mt-3 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
                    <p className="text-xs text-white font-semibold">
                      Paid Till: {new Date(paymentSettledTill).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div
              className="bg-gradient-to-r from-green-600 via-teal-600 to-cyan-600 rounded-2xl shadow-2xl p-6 hover:shadow-[0_25px_50px_-12px_rgba(16,185,129,0.5)] transition-all duration-500 hover:scale-[1.02] cursor-pointer"
              onMouseEnter={() => playMoneyCountingSound()}
            >
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <IndianRupee size={24} className="text-white" />
                  <div>
                    <p className="text-lg text-teal-100 font-bold">Est. Payment</p>
                    <p className="text-xs text-teal-200">{selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : selectedDate}</p>
                  </div>
                  <button
                    onClick={() => setShowDueAmount(!showDueAmount)}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-md p-2 rounded-lg transition-all duration-300 border border-white/30 hover:border-white/40 shadow-lg hover:scale-110"
                    title={showDueAmount ? 'Hide Amount' : 'Show Amount'}
                  >
                    {showDueAmount ? (
                      <Eye size={16} className="text-white" />
                    ) : (
                      <EyeOff size={16} className="text-white" />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <p className="text-6xl font-black text-white">
                    {showDueAmount ? `₹${todayEstimatePayment.toFixed(2)}` : '₹•••••'}
                  </p>
                  {todayTotalMembers > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-4xl font-bold text-white/60">/</span>
                      <div className="text-center">
                        <p className="text-3xl font-black text-white">{todayTotalMembers}</p>
                        <p className="text-xs font-bold text-teal-100">members</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 inline-block shadow-lg mb-3">
                  <p className="text-xs text-white font-bold">
                    Based on meetings added on {selectedDate === new Date().toISOString().split('T')[0] ? 'this day' : 'that date'}
                  </p>
                </div>
                <p className="text-sm text-teal-100">Amount you'll need to pay</p>
              </div>
            </div>
          </div>
        )}

        {!isSubClient && dailyDues.length > 0 && (
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 rounded-2xl shadow-xl p-4 mb-6">
            <>
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="w-full bg-white/20 hover:bg-white/30 rounded-lg px-3 py-2 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                {showBreakdown ? '▲ Hide' : '▼ Show'} Date-wise Breakdown ({dailyDues.length} dates)
              </button>
              {showBreakdown && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 max-h-64 overflow-y-auto mt-3">
                  <div className="space-y-1.5">
                    {dailyDues.map((due) => {
                      const finalAmount = Number(due.amount || 0);

                      return (
                        <button
                          key={due.id}
                          onClick={() => {
                            setSelectedDate(due.date);
                            setSelectedDueDate(due.date);
                            setShowMeetingBreakdown(true);
                            setTimeout(() => {
                              breakdownSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 100);
                          }}
                          className="w-full text-left px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all text-white group"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="font-semibold text-sm">{new Date(due.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                              <span className="text-white/70 text-xs">{due.meeting_count} mtg{due.meeting_count > 1 ? 's' : ''}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-lg text-yellow-300">₹{Math.round(finalAmount)}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className={`rounded-2xl shadow-2xl p-4 md:p-6 transition-all duration-500 ${
            isDark
              ? 'bg-gradient-to-br from-gray-800 via-slate-800 to-gray-800 border border-gray-700/50 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]'
              : 'bg-gradient-to-br from-white via-gray-50 to-white border border-gray-200/50 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] hover:border-blue-200'
          }`}>
            <h2 className={`text-xl md:text-2xl font-bold mb-4 md:mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Add New Meeting
            </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClassName}>
                Meeting Name *
              </label>
              <div className="relative meeting-name-input">
                <input
                  type="text"
                  value={meetingName}
                  onChange={(e) => {
                    setMeetingName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className={inputClassName}
                  placeholder="e.g., Team Standup (Start typing or click to see previous meetings)"
                  required
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className={`absolute z-10 w-full mt-1 border-2 rounded-xl shadow-2xl max-h-64 overflow-y-auto ${
                    isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-slate-300'
                  }`}>
                    <div className={`sticky top-0 px-4 py-2 border-b-2 ${
                      isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-slate-100 border-slate-300 text-slate-700'
                    }`}>
                      <p className="text-xs font-bold">Previous Meetings - Click to use</p>
                    </div>
                    {filteredSuggestions.map((meeting, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectSuggestion(meeting)}
                        className={`w-full text-left px-4 py-3 transition-all duration-200 border-b last:border-b-0 hover:shadow-md ${
                          isDark ? 'hover:bg-gray-700 border-gray-700 text-white' : 'hover:bg-slate-100 border-gray-200'
                        }`}
                      >
                        <div className={`font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{meeting.meeting_name}</div>
                        <div className={`flex flex-wrap gap-2 text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">ID: {meeting.meeting_id}</span>
                          <span className="bg-blue-100 px-2 py-0.5 rounded">{meeting.hour || 8}:{String(meeting.minutes || 0).padStart(2, '0')} {meeting.time_period || 'PM'}</span>
                          <span className="bg-green-100 px-2 py-0.5 rounded">{meeting.member_count || 1} members</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClassName}>
                  Meeting ID *
                </label>
                <input
                  type="text"
                  value={meetingId}
                  onChange={(e) => setMeetingId(e.target.value.replace(/\s/g, ''))}
                  className={inputClassName}
                  placeholder="1234567890"
                  required
                />
              </div>

              <div>
                <label className={labelClassName}>
                  Password *
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClassName}
                  placeholder="Password"
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelClassName}>
                Time
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                  className={isDark ? 'px-3 py-2.5 rounded-xl border-2 bg-gray-900 border-gray-500 text-white focus:border-blue-400 outline-none transition-all duration-300 shadow-lg' : 'px-3 py-2.5 rounded-xl border bg-white border-gray-300 text-gray-900 focus:border-slate-500 outline-none transition-all duration-300'}
                >
                  {Array.from({ length: 13 }, (_, i) => i).map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <select
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  className={isDark ? 'px-3 py-2.5 rounded-xl border-2 bg-gray-900 border-gray-500 text-white focus:border-blue-400 outline-none transition-all duration-300 shadow-lg' : 'px-3 py-2.5 rounded-xl border bg-white border-gray-300 text-gray-900 focus:border-slate-500 outline-none transition-all duration-300'}
                >
                  <option value={5}>05</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                  <option value={25}>25</option>
                  <option value={30}>30</option>
                  <option value={35}>35</option>
                  <option value={40}>40</option>
                  <option value={45}>45</option>
                  <option value={50}>50</option>
                  <option value={55}>55</option>
                  <option value={60}>00</option>
                </select>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setTimePeriod('AM')}
                    className={`flex-1 px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${
                      timePeriod === 'AM'
                        ? isDark ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-400' : 'bg-slate-800 text-white shadow-lg'
                        : isDark ? 'bg-gray-900 text-gray-300 hover:bg-gray-700 border-2 border-gray-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimePeriod('PM')}
                    className={`flex-1 px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${
                      timePeriod === 'PM'
                        ? isDark ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-400' : 'bg-slate-800 text-white shadow-lg'
                        : isDark ? 'bg-gray-900 text-gray-300 hover:bg-gray-700 border-2 border-gray-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Members
              </label>
              <input
                type="number"
                min="1"
                value={memberCount}
                onChange={(e) => setMemberCount(Number(e.target.value))}
                onWheel={(e) => e.currentTarget.blur()}
                className={inputClassName}
                placeholder="1"
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Member Type
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMemberType('indian')}
                  className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
                    memberType === 'indian'
                      ? 'bg-green-600 text-white shadow-lg border-2 border-green-400'
                      : isDark ? 'bg-gray-900 text-gray-300 hover:bg-gray-700 border-2 border-gray-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🇮🇳 Indian
                </button>
                <button
                  type="button"
                  onClick={() => setMemberType('foreigners')}
                  className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
                    memberType === 'foreigners'
                      ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-400'
                      : isDark ? 'bg-gray-900 text-gray-300 hover:bg-gray-700 border-2 border-gray-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🌍 Foreigners
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="instant"
                checked={isInstant}
                onChange={(e) => setIsInstant(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-slate-800 focus:ring-slate-500"
              />
              <label htmlFor="instant" className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Mark as Instant Meeting
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowRecurringModal(true)}
                className={`py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border-2 ${
                  isDark
                    ? 'bg-gray-800 hover:bg-gray-700 text-white border-gray-600'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m17 2 4 4-4 4"></path>
                  <path d="M3 11v-1a4 4 0 0 1 4-4h14"></path>
                  <path d="m7 22-4-4 4-4"></path>
                  <path d="M21 13v1a4 4 0 0 1-4 4H3"></path>
                </svg>
                Mark as Daily
              </button>
              <button
                type="submit"
                className={`font-bold py-3 px-4 text-sm rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.02] ${
                  isDark
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-2 border-blue-400'
                    : 'bg-slate-800 hover:bg-slate-900 text-white'
                }`}
              >
                <Plus size={16} />
                Add Meeting
              </button>
            </div>
          </form>

          {showRecurringModal && (
            <DailyMeetingRecurring
              isDark={isDark}
              onSubmit={async (recurringData) => {
                if (!meetingId || !password) {
                  alert('Please fill Meeting ID and Password first!');
                  setShowRecurringModal(false);
                  return;
                }

                const finalMeetingName = meetingName.trim() || `Daily Meeting ${meetingId}`;

                const dayNameToNumber: Record<string, number> = {
                  'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
                  'Thursday': 4, 'Friday': 5, 'Saturday': 6
                };
                const exceptionDayNumbers = (recurringData.exceptionDays || []).map(day => dayNameToNumber[day]).filter(n => n !== undefined);
                const allDays = [0, 1, 2, 3, 4, 5, 6];
                const selectedDays = allDays.filter(d => !exceptionDayNumbers.includes(d));

                const recurringMeeting = {
                  client_id: user.id,
                  client_name: user.name,
                  meeting_name: finalMeetingName,
                  meeting_id: meetingId,
                  password: password,
                  hour: hour,
                  minutes: minutes,
                  time_period: timePeriod,
                  member_count: memberCount,
                  member_type: memberType,
                  is_active: true,
                  selected_days: selectedDays
                };

                const { data: newRecurringMeeting, error: recurringError } = await supabase
                  .from('recurring_meeting_templates')
                  .insert([recurringMeeting])
                  .select()
                  .single();

                if (recurringError) {
                  alert('Error creating recurring meeting: ' + recurringError.message);
                  setShowRecurringModal(false);
                  return;
                }

                const today = new Date().toISOString().split('T')[0];
                const todayDayOfWeek = new Date().getDay();

                if (!selectedDays.includes(todayDayOfWeek)) {
                  alert(`Daily recurring created! But today is a skip day, so no meeting added for today.`);
                  setShowRecurringModal(false);
                  setMeetingId('');
                  setPassword('');
                  setMeetingName('');
                  setHour(8);
                  setMinutes(0);
                  setTimePeriod('PM');
                  setMemberCount(1);
                  setMemberType('indian');
                  setIsInstant(false);
                  await fetchRecurringMeetings();
                  return;
                }

                const todayMeeting = {
                  client_id: user.id,
                  client_name: user.name,
                  meeting_name: finalMeetingName,
                  meeting_id: meetingId,
                  password: password,
                  hour: hour,
                  minutes: minutes,
                  time_period: timePeriod,
                  member_count: memberCount,
                  member_type: memberType,
                  attended: false,
                  scheduled_date: today,
                  is_instant: isInstant,
                  recurring_template_id: newRecurringMeeting.id,
                  is_recurring: true
                };

                const { error: meetingError } = await supabase
                  .from('meetings')
                  .insert([todayMeeting]);

                if (meetingError) {
                  console.error('Error creating today meeting:', meetingError);
                  alert('Daily recurring created but failed to add today\'s meeting. Please refresh.');
                } else {
                  alert('✅ Daily recurring created! Today\'s meeting added automatically.');
                }

                setMeetingId('');
                setPassword('');
                setHour(8);
                setMinutes(0);
                setTimePeriod('PM');
                setMemberCount(1);
                setMemberType('indian');
                setIsInstant(false);
                setScheduledDate('');

                const todayStr = new Date().toISOString().split('T')[0];
                setMeetingsCache(prev => {
                  const newCache = { ...prev };
                  delete newCache[todayStr];
                  return newCache;
                });

                await fetchRecurringMeetings();
                await fetchMeetings(pricePerMember);

                setShowRecurringModal(false);
              }}
              onCancel={() => setShowRecurringModal(false)}
            />
          )}

          {isCohost && (
            <div className="mt-6">
              <CohostProfitStack
                cohostId={user.id}
                cohostName={user.name}
                cohostRate={cohostRate}
              />
            </div>
          )}

          {recurringMeetings.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowRecurringList(!showRecurringList)}
                className={`w-full px-4 py-2 rounded-xl font-semibold transition-all flex items-center justify-between ${
                  isDark
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                <span>⏰ Daily Recurring Meetings ({recurringMeetings.length})</span>
                <span>{showRecurringList ? '▲' : '▼'}</span>
              </button>

              {showRecurringList && (
                <div className="mt-3 space-y-2">
                  {recurringMeetings.map(rm => (
                    <div key={rm.id} className={`p-3 rounded-lg border-2 ${
                      isDark
                        ? 'bg-gray-800 border-green-700'
                        : 'bg-green-50 border-green-300'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{rm.meeting_name}</div>
                          <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            <span>🕐 {rm.hour}:{String(rm.minutes).padStart(2, '0')} {rm.time_period}</span>
                            <span className="mx-2">•</span>
                            <span>👥 {rm.member_count} {rm.member_type}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromDailyList(rm.id)}
                          className="ml-3 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-all"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          </div>

          <div className={`rounded-2xl shadow-2xl p-4 md:p-6 border transition-all duration-500 lg:row-span-2 ${
            isDark
              ? 'bg-gradient-to-br from-gray-800 via-slate-800 to-gray-800 border-gray-700/50'
              : 'bg-gradient-to-br from-white via-gray-50 to-white border-gray-200/50'
          }`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
              <h2 className={`text-xl md:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                My Meetings - {dateLabel}
                <span className="ml-2 text-lg font-normal text-gray-500">
                  ({getFilteredMeetings().length})
                </span>
              </h2>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleReplicateYesterday}
                  className="px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
                  title="Copy all yesterday's meetings to today"
                >
                  <RefreshCw size={16} />
                  Replicate
                </button>
                {meetings.length > 0 && (
                  <>
                <button
                  onClick={handleOpenAll}
                  className="px-4 py-2 text-sm bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open All
                </button>
                <button
                  onClick={() => setShowSearchBar(!showSearchBar)}
                  className={`p-2 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 ${
                    showSearchBar
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                      : isDark
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
                  }`}
                  title="Search meetings"
                >
                  <Search size={20} />
                </button>
                <div className="flex gap-1 border rounded-xl p-1" style={{borderColor: isDark ? '#4b5563' : '#d1d5db'}}>
                  <button
                    onClick={() => setMeetingViewMode('list')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      meetingViewMode === 'list'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : isDark
                        ? 'text-gray-300 hover:bg-gray-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title="List view"
                  >
                    List
                  </button>
                  <button
                    onClick={() => setMeetingViewMode('stack')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      meetingViewMode === 'stack'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : isDark
                        ? 'text-gray-300 hover:bg-gray-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title="Stack view"
                  >
                    Stack
                  </button>
                </div>
                  </>
                )}
              </div>
            </div>

            {meetings.length > 0 && showSearchBar && (
              <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search meetings by name, ID, or password..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full px-4 py-3 pl-10 rounded-xl border-2 transition-all focus:ring-2 ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20'
                    }`}
                    autoFocus
                  />
                  <Search size={18} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-lg transition-all ${
                        isDark ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
                      }`}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {meetings.length > 0 && meetingViewMode === 'list' ? (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {[...getFilteredMeetings()].sort((a, b) => {
                  if (a.is_instant !== b.is_instant) return a.is_instant ? -1 : 1;
                  if (a.attended !== b.attended) return a.attended ? 1 : -1;
                  const memberCountA = a.member_count || 0;
                  const memberCountB = b.member_count || 0;
                  if (memberCountA !== memberCountB) return memberCountB - memberCountA;
                  const hourA = (a.hour || 0) + (a.time_period === 'PM' ? 12 : 0);
                  const hourB = (b.hour || 0) + (b.time_period === 'PM' ? 12 : 0);
                  if (hourA !== hourB) return hourB - hourA;
                  return (b.minutes || 0) - (a.minutes || 0);
                }).map((meeting) => (
                  <div
                    key={meeting.id}
                    className={`flex items-center gap-3 p-3 rounded-xl shadow-md transition-all hover:shadow-lg ${
                      meeting.is_instant && !meeting.attended
                        ? isDark
                          ? 'bg-gradient-to-r from-amber-600/30 to-orange-600/30 border-2 border-amber-500/50'
                          : 'bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-amber-400'
                        : meeting.attended
                        ? isDark
                          ? 'bg-gray-800/50 border border-gray-700/50 opacity-60'
                          : 'bg-gray-100 border border-gray-300 opacity-60'
                        : isDark
                        ? 'bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border border-blue-700/50'
                        : 'bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {meeting.meeting_name}
                        </h3>
                        {isCohost && meeting.display_name && (
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                            meeting.display_name === 'SELF'
                              ? (isDark ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50' : 'bg-emerald-100 text-emerald-700 border border-emerald-300')
                              : meeting.display_name.startsWith('SUB CLIENT')
                              ? (isDark ? 'bg-purple-600 text-white border border-purple-400' : 'bg-purple-500 text-white border border-purple-400')
                              : (isDark ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50' : 'bg-blue-100 text-blue-700 border border-blue-300')
                          }`}>
                            {meeting.display_name}
                          </span>
                        )}
                        {meeting.is_instant && !meeting.attended && (
                          <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded animate-pulse">
                            INSTANT
                          </span>
                        )}
                        {meeting.attended && (
                          <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded">
                            ✓
                          </span>
                        )}
                        {meeting.status === 'not_live' && (
                          <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded">
                            NOT LIVE
                          </span>
                        )}
                        {meeting.status === 'wrong_credentials' && (
                          <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs font-bold rounded">
                            WRONG CREDS
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className={`font-mono ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          ID: {meeting.meeting_id}
                        </span>
                        <span className={`font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Pass: {meeting.password}
                        </span>
                        {meeting.hour !== undefined && meeting.time_period && (
                          <span className={`flex items-center gap-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            <Clock size={10} />
                            {meeting.hour}:{String(meeting.minutes || 15).padStart(2, '0')}{meeting.time_period}
                          </span>
                        )}
                        {meeting.member_count !== undefined && meeting.member_count > 0 && (
                          <span className={`flex items-center gap-1 font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            <Users size={10} />
                            {meeting.member_count} {meeting.member_type === 'foreigners' ? '🌍' : '🇮🇳'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {meeting.screenshot_url && (
                        <button
                          onClick={() => setSelectedScreenshot(meeting.screenshot_url || null)}
                          className={`p-2 rounded-lg transition-all ${
                            isDark
                              ? 'bg-green-600/40 hover:bg-green-600/60 text-green-300'
                              : 'bg-green-100 hover:bg-green-200 text-green-700'
                          }`}
                          title="View Screenshot"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      {!meeting.attended && meeting.status !== 'not_live' && meeting.status !== 'wrong_credentials' && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            const randomName = getRandomHindiName();
                            const params = new URLSearchParams({
                              pwd: meeting.password,
                              uname: randomName
                            });
                            window.open(`https://zoom.us/wc/join/${meeting.meeting_id}?${params.toString()}`, '_blank', 'noopener,noreferrer');
                          }}
                          className={`p-2 rounded-lg transition-all ${
                            meeting.is_instant
                              ? 'bg-orange-500/80 hover:bg-orange-600 text-white'
                              : isDark
                              ? 'bg-blue-600/40 hover:bg-blue-600/60 text-blue-300'
                              : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                          }`}
                          title="Join Meeting"
                        >
                          <Video size={16} />
                        </button>
                      )}
                      {(!meeting.screenshot_url || meeting.screenshot_url === '' || meeting.status === 'not_live' || meeting.status === 'wrong_credentials') && (
                        <button
                          onClick={() => deleteMeeting(meeting.id)}
                          className={`p-2 rounded-lg transition-all ${
                            isDark
                              ? 'bg-red-600/40 hover:bg-red-600/60 text-red-300'
                              : 'bg-red-100 hover:bg-red-200 text-red-700'
                          }`}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : meetings.length > 0 ? (
              <div className="max-h-[500px] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...getFilteredMeetings()].sort((a, b) => {
                    if (a.is_instant !== b.is_instant) return a.is_instant ? -1 : 1;
                    if (a.attended !== b.attended) return a.attended ? 1 : -1;
                    const memberCountA = a.member_count || 0;
                    const memberCountB = b.member_count || 0;
                    if (memberCountA !== memberCountB) return memberCountB - memberCountA;
                    const hourA = (a.hour || 0) + (a.time_period === 'PM' ? 12 : 0);
                    const hourB = (b.hour || 0) + (b.time_period === 'PM' ? 12 : 0);
                    if (hourA !== hourB) return hourB - hourA;
                    return (b.minutes || 0) - (a.minutes || 0);
                  }).map((meeting) => (
                    <div
                      key={meeting.id}
                      className={`p-4 rounded-2xl shadow-lg transition-all hover:shadow-xl ${
                        meeting.is_instant && !meeting.attended
                          ? isDark
                            ? 'bg-gradient-to-br from-amber-900/40 to-orange-900/40 border-2 border-amber-500/60'
                            : 'bg-gradient-to-br from-amber-100/80 to-orange-100/80 border-2 border-amber-400/80'
                          : meeting.attended
                          ? isDark
                            ? 'bg-gray-800/40 border border-gray-700/50 opacity-50'
                            : 'bg-gray-100/50 border border-gray-300/50 opacity-50'
                          : isDark
                          ? 'bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-700/60'
                          : 'bg-gradient-to-br from-blue-50/80 to-cyan-50/80 border border-blue-200/80'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {meeting.meeting_name}
                          </h3>
                          {isCohost && meeting.display_name && (
                            <p className={`text-xs font-bold mb-1 px-2 py-0.5 rounded-full inline-block ${
                              meeting.display_name === 'SELF'
                                ? (isDark ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50' : 'bg-emerald-100 text-emerald-700 border border-emerald-300')
                                : meeting.display_name.startsWith('SUB CLIENT')
                                ? (isDark ? 'bg-purple-600 text-white border border-purple-400' : 'bg-purple-500 text-white border border-purple-400')
                                : (isDark ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50' : 'bg-blue-100 text-blue-700 border border-blue-300')
                            }`}>
                              {meeting.display_name}
                            </p>
                          )}
                          {meeting.hour !== undefined && meeting.time_period && (
                            <p className={`text-sm flex items-center gap-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                              <Clock size={14} />
                              {meeting.hour}:{String(meeting.minutes || 15).padStart(2, '0')} {meeting.time_period}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {meeting.is_instant && !meeting.attended && (
                            <span className="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-lg animate-pulse">
                              INSTANT
                            </span>
                          )}
                          {meeting.attended && (
                            <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-lg">
                              ATTENDED
                            </span>
                          )}
                          {meeting.status === 'not_live' && (
                            <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-lg">
                              NOT LIVE
                            </span>
                          )}
                          {meeting.status === 'wrong_credentials' && (
                            <span className="px-3 py-1 bg-yellow-600 text-white text-xs font-bold rounded-lg">
                              WRONG CREDS
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={`p-3 rounded-xl mb-3 space-y-2 ${isDark ? 'bg-black/30' : 'bg-white/50'}`}>
                        <div className="flex gap-4">
                          <div>
                            <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              MEETING ID
                            </p>
                            <p className={`font-mono text-sm font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                              {meeting.meeting_id}
                            </p>
                          </div>
                          <div>
                            <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              PASSWORD
                            </p>
                            <p className={`font-mono text-sm font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                              {meeting.password}
                            </p>
                          </div>
                        </div>
                        {meeting.member_count !== undefined && meeting.member_count > 0 && (
                          <div className="flex gap-4 pt-2 border-t" style={{borderColor: isDark ? '#374151' : '#e5e7eb'}}>
                            <div>
                              <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                MEMBERS
                              </p>
                              <p className={`text-sm font-bold flex items-center gap-1 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                {meeting.member_count} {meeting.member_type === 'foreigners' ? '🌍' : '🇮🇳'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {meeting.screenshot_url && (
                          <button
                            onClick={() => setSelectedScreenshot(meeting.screenshot_url || null)}
                            className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                              isDark
                                ? 'bg-green-600/40 hover:bg-green-600/60 text-green-300'
                                : 'bg-green-100 hover:bg-green-200 text-green-700'
                            }`}
                            title="View Screenshot"
                          >
                            <Eye size={16} className="inline mr-1" />
                            View Screenshot
                          </button>
                        )}
                        {!meeting.attended && meeting.status !== 'not_live' && meeting.status !== 'wrong_credentials' && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              const randomName = getRandomHindiName();
                              const params = new URLSearchParams({
                                pwd: meeting.password,
                                uname: randomName
                              });
                              window.open(`https://zoom.us/wc/join/${meeting.meeting_id}?${params.toString()}`, '_blank', 'noopener,noreferrer');
                            }}
                            className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                              meeting.is_instant
                                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                                : isDark
                                ? 'bg-blue-600/60 hover:bg-blue-600/80 text-blue-100'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                            title="Join Meeting"
                          >
                            <Video size={16} className="inline mr-1" />
                            Join Meeting
                          </button>
                        )}
                        {(!meeting.screenshot_url || meeting.screenshot_url === '' || meeting.status === 'not_live' || meeting.status === 'wrong_credentials') && (
                          <button
                            onClick={() => deleteMeeting(meeting.id)}
                            className={`px-3 py-2 rounded-lg transition-all ${
                              isDark
                                ? 'bg-red-600/40 hover:bg-red-600/60 text-red-300'
                                : 'bg-red-100 hover:bg-red-200 text-red-700'
                            }`}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">No meetings for this date</p>
                <p className="text-sm mt-2">Use the Replicate button above to copy yesterday's meetings</p>
              </div>
            )}

          </div>

          {false && totalNetDue > 0 && (
            <div ref={paymentSectionRef} className={`rounded-2xl shadow-2xl p-4 md:p-6 border ${isDark ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 border-gray-700/50' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/50'}`}>
            <div className="flex flex-col md:flex-row items-start justify-between mb-4 gap-4">
              <div className="flex-1">
                <h2 className={`text-xl md:text-2xl font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <span className="text-2xl md:text-3xl text-green-600">₹</span>
                  Upload Payment Proof
                </h2>
              </div>

              <PaymentFormWizard
                userId={user?.id}
                userName={user?.name}
                dailyDues={dailyDues}
                totalNetDue={totalNetDue}
                onSuccess={() => {
                  fetchMyPayments();
                  fetchDailyDues();
                }}
              />
            </div>

            {myPayments.filter(p => p.status === 'pending' || p.status === 'approved').length > 0 && (
              <div className="mt-6 space-y-3">
                <h3 className="text-base md:text-lg font-bold text-gray-900">
                  My Uploaded Payments
                </h3>
                {myPayments.filter(p => p.status === 'pending' || p.status === 'approved').map((payment) => (
                  <div
                    key={payment.id}
                    className={`rounded-xl p-3 md:p-4 border shadow-md transition-all duration-300 ${
                      payment.status === 'pending' ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300' :
                      payment.status === 'approved' ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-300' :
                      'bg-gradient-to-r from-red-50 to-red-100 border-red-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-700">
                            {new Date(payment.payment_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            payment.status === 'pending' ? 'bg-amber-200 text-amber-800' :
                            payment.status === 'approved' ? 'bg-green-200 text-green-800' :
                            'bg-red-200 text-red-800'
                          }`}>
                            {payment.status || 'pending'}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">
                          ₹{payment.amount.toFixed(2)}
                        </p>
                        {payment.payment_upto_date && (
                          <p className="text-xs text-gray-600">
                            Upto: {new Date(payment.payment_upto_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                        {payment.status === 'rejected' && payment.rejected_amount && (
                          <p className="text-xs text-red-600 italic font-semibold mt-1 bg-red-100 px-2 py-1 rounded">
                            Payment not received: ₹{payment.rejected_amount.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => setSelectedScreenshot(payment.screenshot_url)}
                          className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          <ImageIcon size={14} />
                          View
                        </button>
                        {payment.status === 'pending' && (
                          <button
                            onClick={async () => {
                              if (confirm('Delete this payment?')) {
                                const { error } = await supabase
                                  .from('payments')
                                  .delete()
                                  .eq('id', payment.id);
                                if (!error) {
                                  await fetchMyPayments();
                                  await fetchDailyDues();
                                  alert('Payment deleted!');
                                }
                              }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 md:py-2 rounded-lg transition-all text-sm"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
          )}

        </div>

        {selectedScreenshot && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
            <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl max-w-4xl w-full p-4 md:p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Meeting Screenshot
              </h3>
              <img
                src={selectedScreenshot}
                alt="Meeting screenshot"
                className="w-full rounded-xl border-2 border-gray-200"
              />
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="mt-4 w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-4 rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-out {
          0% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; pointer-events: none; }
        }

        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }

        @keyframes glow {
          0%, 100% { text-shadow: 0 0 10px rgba(255, 255, 255, 0.5), 0 0 20px rgba(255, 215, 0, 0.5); }
          50% { text-shadow: 0 0 20px rgba(255, 255, 255, 0.8), 0 0 30px rgba(255, 215, 0, 0.8); }
        }

        .animate-fade-out {
          animation: fade-out 3s ease-in-out forwards;
        }

        .animate-bounce-in {
          animation: bounce-in 1s ease-out;
        }

        .animate-wave {
          animation: wave 2s ease-in-out infinite;
        }

        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
      `}</style>

      {showCalendar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>📅 Select Date</h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Choose a date to view meetings and payment details for that day
            </p>

            <div className="mb-6">
              <label className={`block text-sm font-semibold mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Pick a Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setShowCalendar(false);
                }}
                className={`w-full px-5 py-4 rounded-xl border-2 focus:ring-2 outline-none transition-all text-xl font-semibold ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-400 focus:ring-blue-500/50'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-200'
                }`}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setSelectedDate(today);
                  setShowCalendar(false);
                }}
                className={`flex-1 font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-xl ${
                  isDark
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                📍 Today
              </button>
              <button
                onClick={() => setShowCalendar(false)}
                className={`flex-1 font-bold py-3 px-4 rounded-xl transition-all ${
                  isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      {showReplicateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl border ${
            isDark
              ? 'bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <div className={`flex justify-between items-center p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Replicate Yesterday's Meetings
              </h2>
              <button
                onClick={() => setShowReplicateModal(false)}
                className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X size={24} className={isDark ? 'text-gray-300' : 'text-gray-600'} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="flex items-center justify-between mb-4">
                <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                  Select the meetings you want to copy to today:
                </p>
                <button
                  onClick={() => {
                    const selectableCount = yesterdayMeetings.filter(m => !m.alreadyAddedToday).length;
                    if (selectedMeetingsToReplicate.size === selectableCount) {
                      handleDeselectAllToReplicate();
                    } else {
                      handleSelectAllToReplicate();
                    }
                  }}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                    isDark
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {(() => {
                    const selectableCount = yesterdayMeetings.filter(m => !m.alreadyAddedToday).length;
                    return selectedMeetingsToReplicate.size === selectableCount ? 'Deselect All' : 'Select All';
                  })()}
                </button>
              </div>

              {yesterdayMeetings.some(m => m.is_instant) && (
                <div className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-orange-900/30 border border-orange-700' : 'bg-orange-50 border border-orange-200'}`}>
                  <p className={`text-sm ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>
                    <strong>Note:</strong> Instant meetings (⚡) will be converted to normal meetings when replicated.
                  </p>
                </div>
              )}

              {yesterdayMeetings.length === 0 ? (
                <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No meetings found from yesterday</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {yesterdayMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      onClick={() => toggleMeetingSelection(meeting.id)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        meeting.alreadyAddedToday
                          ? 'cursor-not-allowed opacity-60'
                          : 'cursor-pointer hover:shadow-lg'
                      } ${
                        selectedMeetingsToReplicate.has(meeting.id)
                          ? isDark
                            ? 'bg-purple-900/40 border-purple-500'
                            : 'bg-purple-100 border-purple-400'
                          : isDark
                          ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                          : 'bg-gray-50 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedMeetingsToReplicate.has(meeting.id)}
                          disabled={meeting.alreadyAddedToday}
                          onChange={() => {}}
                          className={`mt-1 w-5 h-5 ${meeting.alreadyAddedToday ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {meeting.meeting_name}
                            </h3>
                            {meeting.attended && (
                              <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded">
                                ✓ Attended
                              </span>
                            )}
                            {meeting.is_instant && (
                              <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded">
                                ⚡ Instant
                              </span>
                            )}
                            {meeting.alreadyAddedToday && (
                              <span className="px-3 py-1 text-xs font-bold rounded-md bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md animate-pulse flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                                Already Added Today
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                            <div className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                              <Clock size={14} className="inline mr-1" />
                              {meeting.hour}:{String(meeting.minutes || 15).padStart(2, '0')} {meeting.time_period}
                            </div>
                            <div className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                              <Users size={14} className="inline mr-1" />
                              {meeting.member_count} {meeting.member_type === 'foreigners' ? '🌍' : '🇮🇳'}
                            </div>
                            <div className={`font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                              <RupeeSymbol className="inline w-3 h-3" />
                              {calculateMeetingPayment(meeting)}
                            </div>
                          </div>
                          <div className={`mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            ID: {meeting.meeting_id} | Pass: {meeting.password}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`flex justify-between items-center p-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {selectedMeetingsToReplicate.size} of {yesterdayMeetings.length} selected
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReplicateModal(false)}
                  className={`px-6 py-2 rounded-xl font-bold transition-all ${
                    isDark
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReplicate}
                  disabled={selectedMeetingsToReplicate.size === 0}
                  className={`px-6 py-2 rounded-xl font-bold transition-all ${
                    selectedMeetingsToReplicate.size === 0
                      ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  Replicate Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNotifications && (
        <div className="fixed top-20 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[600px] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600">
            <h3 className="text-lg font-bold text-white">Notifications</h3>
            <button
              onClick={() => setShowNotifications(false)}
              className="text-white hover:bg-white/20 p-1 rounded-lg transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-50">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <p className="font-semibold">No notifications yet</p>
                <p className="text-sm mt-1">You'll be notified when screenshots are uploaded</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    onClick={() => {
                      if (notification.type === 'payment') {
                        setShowNotifications(false);
                        setTimeout(() => {
                          paymentSectionRef.current?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                          });
                        }, 100);
                      }
                    }}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all ${
                      notification.type === 'payment' ? 'cursor-pointer' : ''
                    } ${
                      !notification.read
                        ? notification.type === 'payment'
                          ? 'bg-orange-100 dark:bg-orange-900/30 border-l-4 border-orange-500 animate-pulse'
                          : 'bg-blue-50 dark:bg-blue-900/20'
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        notification.type === 'screenshot'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : notification.type === 'payment'
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      }`}>
                        {notification.type === 'screenshot' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                            <circle cx="9" cy="9" r="2"></circle>
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                          </svg>
                        ) : notification.type === 'payment' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
                            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="20" height="14" x="2" y="7" rx="2" ry="2"></rect>
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${
                          notification.type === 'payment' && !notification.read
                            ? 'text-orange-700 dark:text-orange-300 text-base'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {notification.time}
                        </p>
                        {notification.type === 'payment' && !notification.read && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 font-bold mt-1">
                            Click to view payment section →
                          </p>
                        )}
                      </div>
                      {!notification.read && (
                        <div className={`w-2 h-2 rounded-full ${
                          notification.type === 'payment' ? 'bg-orange-600' : 'bg-blue-600'
                        }`}></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {notifications.length > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 text-center">
              <button
                onClick={async () => {
                  if (confirm('Clear all notifications?')) {
                    await supabase
                      .from('notifications')
                      .delete()
                      .eq('user_id', user?.id);

                    setNotifications([]);
                    setUnreadCount(0);
                  }
                }}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-bold"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating Sound Control Button */}
      <button
        onClick={() => setShowSoundControls(!showSoundControls)}
        className="fixed bottom-8 left-8 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white p-5 rounded-full shadow-[0_0_40px_rgba(59,130,246,0.6)] hover:shadow-[0_0_60px_rgba(59,130,246,0.8)] transition-all duration-300 hover:scale-110 z-40"
        title="Sound Controls"
      >
        {soundMuted ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4V5z"></path>
            <line x1="23" y1="9" x2="17" y2="15"></line>
            <line x1="17" y1="9" x2="23" y2="15"></line>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4V5z"></path>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        )}
      </button>

      {/* Sound Control Panel */}
      {showSoundControls && (
        <div className="fixed bottom-28 left-8 bg-white dark:bg-gray-800 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.3)] border-2 border-gray-200 dark:border-gray-700 p-6 w-80 z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">Sound Settings</h3>
            <button
              onClick={() => setShowSoundControls(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="space-y-4">
            <button
              onClick={() => setSoundMuted(!soundMuted)}
              className={`w-full px-4 py-3 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg hover:scale-105 ${
                soundMuted
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {soundMuted ? '🔇 Unmute Sounds' : '🔊 Mute Sounds'}
            </button>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Volume</label>
                <span className="text-sm font-black text-blue-600 dark:text-blue-400">{Math.round(soundVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={soundVolume}
                onChange={(e) => {
                  const newVolume = parseFloat(e.target.value);
                  setSoundVolume(newVolume);
                  if (!soundMuted) {
                    playNotificationSound();
                  }
                }}
                className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
            <button
              onClick={() => {
                if (!soundMuted) {
                  playNotificationSound();
                }
              }}
              disabled={soundMuted}
              className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg hover:scale-105"
            >
              🔔 Test Sound
            </button>
          </div>
        </div>
      )}

      {showInvoiceModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          style={{ zIndex: 9999 }}
          onClick={() => setShowInvoiceModal(false)}
        >
          <div
            className={`relative max-w-md w-full rounded-2xl shadow-2xl p-8 animate-scale-in ${
              isDark ? 'bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowInvoiceModal(false)}
              className={`absolute top-4 right-4 p-2 rounded-lg transition-all ${
                isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <X size={20} />
            </button>

            <div className="mb-6 text-center">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
                isDark ? 'bg-blue-500/20' : 'bg-blue-50'
              }`}>
                <FileText className={`w-8 h-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <h2 className={`text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                INVOICE TYPE
              </h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Choose your preferred invoice format
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleGenerateInvoice(true)}
                className={`w-full p-4 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-lg group ${
                  isDark
                    ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500'
                    : 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    isDark ? 'bg-blue-500/20' : 'bg-blue-100'
                  }`}>
                    <ImageIcon className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div className="text-left flex-1">
                    <div className={`font-bold text-base mb-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Invoice WITH Screenshots
                    </div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Includes meeting screenshots as proof
                    </div>
                  </div>
                  <ArrowRight className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'} group-hover:translate-x-1 transition-transform`} />
                </div>
              </button>

              <button
                onClick={() => handleGenerateInvoice(false)}
                className={`w-full p-4 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-lg group ${
                  isDark
                    ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500'
                    : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'
                  }`}>
                    <FileText className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  </div>
                  <div className="text-left flex-1">
                    <div className={`font-bold text-base mb-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      General Invoice
                    </div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Clean invoice without screenshots
                    </div>
                  </div>
                  <ArrowRight className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'} group-hover:translate-x-1 transition-transform`} />
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentSection && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className={`w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl animate-scale-in ${
            isDark ? 'bg-gray-900' : 'bg-white'
          }`}>
            <div className={`sticky top-0 z-10 p-4 md:p-6 border-b ${
              isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Payment Center
                </h2>
                <button
                  onClick={() => setShowPaymentSection(false)}
                  className={`p-2 rounded-lg transition-all ${
                    isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                  }`}
                >
                  <X size={24} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentView('make-payment')}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                    paymentView === 'make-payment'
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                      : isDark
                      ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Make Payment
                </button>
                <button
                  onClick={() => setPaymentView('past-payments')}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                    paymentView === 'past-payments'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                      : isDark
                      ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Payment Overview
                </button>
              </div>
            </div>

            <div className="p-4 md:p-6">
              {paymentView === 'make-payment' ? (
                <div className="space-y-6">
                  <div className={`rounded-xl p-6 ${
                    isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200'
                  }`}>
                    <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Upload Payment Proof
                    </h3>
                    <PaymentFormWizard
                      userId={user?.id}
                      userName={user?.name}
                      dailyDues={dailyDues}
                      totalNetDue={totalNetDue}
                      onSuccess={() => {
                        fetchMyPayments();
                        fetchDailyDues();
                        setPaymentView('past-payments');
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    My Payment History
                  </h3>

                  {myPayments.length === 0 ? (
                    <div className={`text-center py-12 rounded-xl ${
                      isDark ? 'bg-gray-800/50 text-gray-400' : 'bg-gray-50 text-gray-600'
                    }`}>
                      <p className="text-lg font-semibold mb-2">No payments yet</p>
                      <p className="text-sm">Your payment history will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myPayments.map((payment) => (
                        <div
                          key={payment.id}
                          className={`rounded-xl p-4 border shadow-md transition-all duration-300 ${
                            payment.status === 'pending'
                              ? isDark
                                ? 'bg-amber-900/20 border-amber-700'
                                : 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300'
                              : payment.status === 'approved'
                              ? isDark
                                ? 'bg-green-900/20 border-green-700'
                                : 'bg-gradient-to-r from-green-50 to-green-100 border-green-300'
                              : isDark
                              ? 'bg-red-900/20 border-red-700'
                              : 'bg-gradient-to-r from-red-50 to-red-100 border-red-300'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <p className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {new Date(payment.payment_date).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </p>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  payment.status === 'pending'
                                    ? 'bg-amber-200 text-amber-900'
                                    : payment.status === 'approved'
                                    ? 'bg-green-200 text-green-900'
                                    : 'bg-red-200 text-red-900'
                                }`}>
                                  {payment.status === 'pending' ? '⏳ Pending' : payment.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                                </span>
                              </div>
                              <p className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                ₹{payment.amount.toFixed(2)}
                              </p>
                              {payment.payment_upto_date && (
                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                  Payment upto: {new Date(payment.payment_upto_date).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </p>
                              )}
                              {payment.status === 'rejected' && payment.rejected_amount && (
                                <p className="text-sm text-red-600 dark:text-red-400 font-semibold mt-2 bg-red-100 dark:bg-red-900/30 px-3 py-2 rounded-lg">
                                  ❌ Payment not received: ₹{payment.rejected_amount.toFixed(2)}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => setSelectedScreenshot(payment.screenshot_url)}
                                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                              >
                                <ImageIcon size={16} />
                                View Screenshot
                              </button>
                              {payment.status === 'pending' && (
                                <button
                                  onClick={async () => {
                                    if (confirm('Delete this payment?')) {
                                      const { error } = await supabase
                                        .from('payments')
                                        .delete()
                                        .eq('id', payment.id);
                                      if (!error) {
                                        await fetchMyPayments();
                                        await fetchDailyDues();
                                        alert('Payment deleted!');
                                      }
                                    }
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCohostDashboard && (
        <CohostClientDashboard
          cohostUserId={user.id}
          cohostName={user.name}
          cohostPrefix={cohostPrefix}
          onClose={() => setShowCohostDashboard(false)}
        />
      )}

      {showSubClientPayModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowSubClientPayModal(false)}>
          <div
            className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
              isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`sticky top-0 z-10 px-6 py-4 border-b ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Pay Dues
                  </h2>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Pay to: <span className="font-bold text-green-500">{parentCohostName}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowSubClientPayModal(false)}
                  className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-slate-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                  <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>Your Rate</p>
                  <p className={`text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>{'\u20B9'}{pricePerMember}<span className="text-sm font-normal">/member</span></p>
                </div>
                <div className={`p-4 rounded-xl ${isDark ? 'bg-red-900/20 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
                  <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-red-300' : 'text-red-600'}`}>Total Due</p>
                  <p className={`text-2xl font-bold ${isDark ? 'text-red-400' : 'text-red-700'}`}>{'\u20B9'}{totalNetDue.toFixed(0)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/50 border border-slate-700' : 'bg-gray-50 border border-gray-200'}`}>
                  <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                    UPI Payment
                  </h3>
                  {cohostPaymentMethods?.qr_code_url && (
                    <div className="text-center mb-4">
                      <img
                        src={cohostPaymentMethods.qr_code_url}
                        alt="Payment QR Code"
                        className="max-w-32 max-h-32 mx-auto rounded-xl border-2 border-green-500 shadow-lg"
                      />
                      <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Scan to Pay</p>
                    </div>
                  )}
                  {cohostPaymentMethods?.upi_id && (
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-white'}`}>
                      <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>UPI ID</p>
                      <div className="flex items-center gap-2">
                        <p className={`font-mono text-sm font-bold flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{cohostPaymentMethods.upi_id}</p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(cohostPaymentMethods.upi_id);
                            alert('UPI ID copied!');
                          }}
                          className={`p-1.5 rounded-lg ${isDark ? 'bg-slate-600 hover:bg-slate-500' : 'bg-gray-200 hover:bg-gray-300'}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        </button>
                      </div>
                    </div>
                  )}
                  {!cohostPaymentMethods?.upi_id && !cohostPaymentMethods?.qr_code_url && (
                    <p className={`text-sm text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>UPI not configured</p>
                  )}
                </div>

                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/50 border border-slate-700' : 'bg-gray-50 border border-gray-200'}`}>
                  <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
                    USDT Payment
                  </h3>
                  {cohostPaymentMethods?.usdt_trc20_address && (
                    <div className={`p-3 rounded-lg mb-3 ${isDark ? 'bg-slate-700' : 'bg-white'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-xs font-bold ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>TRC20 (Tron)</p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(cohostPaymentMethods.usdt_trc20_address);
                            alert('TRC20 address copied!');
                          }}
                          className={`p-1 rounded ${isDark ? 'bg-slate-600 hover:bg-slate-500' : 'bg-gray-200 hover:bg-gray-300'}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        </button>
                      </div>
                      <p className={`font-mono text-xs break-all ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{cohostPaymentMethods.usdt_trc20_address}</p>
                    </div>
                  )}
                  {cohostPaymentMethods?.usdt_bep20_address && (
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-white'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-xs font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>BEP20 (BSC)</p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(cohostPaymentMethods.usdt_bep20_address);
                            alert('BEP20 address copied!');
                          }}
                          className={`p-1 rounded ${isDark ? 'bg-slate-600 hover:bg-slate-500' : 'bg-gray-200 hover:bg-gray-300'}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        </button>
                      </div>
                      <p className={`font-mono text-xs break-all ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{cohostPaymentMethods.usdt_bep20_address}</p>
                    </div>
                  )}
                  {!cohostPaymentMethods?.usdt_trc20_address && !cohostPaymentMethods?.usdt_bep20_address && (
                    <p className={`text-sm text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>USDT not configured</p>
                  )}
                </div>
              </div>

              <div className={`border-t pt-6 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <p className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  After Payment, Submit Proof:
                </p>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={() => setSubClientPaymentAmount(totalNetDue.toFixed(0))}
                      className={`py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                        isDark
                          ? 'bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30'
                          : 'bg-green-50 text-green-700 border border-green-300 hover:bg-green-100'
                      }`}
                    >
                      Settle All ({'\u20B9'}{totalNetDue.toFixed(0)})
                    </button>
                    <button
                      onClick={() => setSubClientPaymentAmount(dailyNetDue.toFixed(0))}
                      className={`py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                        isDark
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30'
                          : 'bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100'
                      }`}
                    >
                      Today Only ({'\u20B9'}{dailyNetDue.toFixed(0)})
                    </button>
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Amount Paid (INR)
                    </label>
                    <input
                      type="number"
                      value={subClientPaymentAmount}
                      onChange={(e) => setSubClientPaymentAmount(e.target.value)}
                      placeholder="Enter amount"
                      className={`w-full px-4 py-3 rounded-xl border ${
                        isDark
                          ? 'bg-slate-800 border-slate-600 text-white placeholder-gray-500'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Payment Screenshot
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSubClientPaymentScreenshot(e.target.files?.[0] || null)}
                      className="hidden"
                      id="subclient-payment-screenshot"
                    />
                    <label
                      htmlFor="subclient-payment-screenshot"
                      className={`flex items-center justify-center gap-3 w-full px-4 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                        isDark
                          ? 'border-slate-600 hover:border-green-500 bg-slate-800/50 text-gray-300'
                          : 'border-gray-300 hover:border-green-500 bg-gray-50 text-gray-600'
                      }`}
                    >
                      <ImageIcon size={24} />
                      <span>{subClientPaymentScreenshot ? subClientPaymentScreenshot.name : 'Click to upload screenshot'}</span>
                    </label>
                  </div>

                  <button
                    onClick={handleSubClientPaymentSubmit}
                    disabled={subClientPaymentSubmitting || !subClientPaymentAmount || !subClientPaymentScreenshot}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {subClientPaymentSubmitting ? (
                      <>
                        <Loader size={20} className="animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <IndianRupee size={20} />
                        Submit Payment
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showManageClients && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowManageClients(false)}>
          <div
            className={`max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
              isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between ${
              isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
            }`}>
              <div>
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Manage My Clients
                </h2>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Your Co-host Prefix: <span className="font-bold text-purple-500">{cohostPrefix}</span>
                </p>
              </div>
              <button
                onClick={() => setShowManageClients(false)}
                className={`p-2 rounded-xl transition-all ${
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'
                }`}
              >
                <X size={24} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
              </button>
            </div>

            <div className="p-6">
              {myClients.length === 0 ? (
                <div className="text-center py-12">
                  <Users size={64} className={`mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                  <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    No Clients Yet
                  </h3>
                  <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    Clients using your prefix ({cohostPrefix}) will appear here
                  </p>
                  <div className={`mt-6 p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-blue-50'}`}>
                    <p className={`text-sm font-semibold mb-2 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                      How clients can join:
                    </p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Tell them to login with email format: <span className="font-bold">{cohostPrefix}-ClientName</span>
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Example: <span className="font-mono bg-purple-500/20 px-2 py-1 rounded">{cohostPrefix}-John</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className={`mb-4 p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-blue-50'}`}>
                    <p className={`text-sm font-semibold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                      Total Clients: {myClients.length}
                    </p>
                  </div>
                  {myClients.map((client) => (
                    <div
                      key={client.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 hover:border-slate-600'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isDark ? 'bg-gradient-to-br from-purple-600 to-pink-600' : 'bg-gradient-to-br from-purple-500 to-pink-500'
                            }`}>
                              <span className="text-white font-bold text-lg">
                                {client.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {client.name}
                              </h3>
                              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {client.email}
                              </p>
                            </div>
                            {client.is_blocked && (
                              <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-500 text-white">
                                BLOCKED
                              </span>
                            )}
                          </div>
                          <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                            Joined: {new Date(client.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedScreenshot && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="relative max-w-6xl w-full max-h-[90vh]">
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="absolute -top-12 right-0 bg-white hover:bg-gray-100 text-gray-900 font-bold py-2 px-4 rounded-lg transition-all"
            >
              Close
            </button>
            <img
              src={selectedScreenshot}
              alt="Screenshot"
              className="w-full h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {showPaymentCongrats && (
        <PaymentCongratulationsNotification
          onClose={() => {
            setShowPaymentCongrats(false);
            handlePaymentNotificationComplete();
          }}
          onAnimationComplete={handlePaymentNotificationComplete}
          paymentAmount={approvedPaymentAmount}
          totalDue={totalNetDueTillToday}
        />
      )}

      {showCongratsModal && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowCongratsModal(false)}>
          <div
            className={`max-w-md w-full rounded-2xl shadow-2xl p-8 animate-scale-in ${
              isDark ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-gradient-to-br from-white to-gray-50'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className={`text-2xl font-black mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Congratulations!
              </h3>
              <p className={`text-lg mb-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {congratsMessage}
              </p>
              <button
                onClick={() => setShowCongratsModal(false)}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold shadow-lg transition-all hover:scale-105"
              >
                Awesome!
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
