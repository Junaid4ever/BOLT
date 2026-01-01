import { useState, useEffect } from 'react';
import { supabase, Meeting } from '../lib/supabase';
import { Video, Check, Square, Trash2, Users, Clock } from 'lucide-react';
import { joinZoomMeeting } from '../utils/zoomHelper';

interface MeetingListProps {
  isDark: boolean;
  meetings?: Meeting[];
  onMeetingUpdated?: () => void;
  isAdmin?: boolean;
  currentUser?: any;
}

interface SubClient {
  id: string;
  name: string;
}

export function MeetingList({ isDark, meetings: propMeetings, onMeetingUpdated, isAdmin = false, currentUser }: MeetingListProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTime, setSelectedTime] = useState<string>('all');
  const [showOpenAllModal, setShowOpenAllModal] = useState(false);
  const [subClients, setSubClients] = useState<SubClient[]>([]);

  const fetchSubClients = async () => {
    if (!currentUser) return;

    const { data } = await supabase
      .from('users')
      .select('id, name')
      .eq('parent_user_id', currentUser.id)
      .eq('role', 'client')
      .not('name', 'like', '[DELETED]%');

    if (data) {
      setSubClients(data);
    }
  };

  const fetchMeetings = async () => {
    if (propMeetings) {
      setMeetings(propMeetings);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (!isAdmin && currentUser) {
      const { data: subClientData } = await supabase
        .from('users')
        .select('id')
        .eq('parent_user_id', currentUser.id)
        .eq('role', 'client')
        .not('name', 'like', '[DELETED]%');

      const subClientIds = subClientData?.map(sc => sc.id) || [];
      const allClientIds = [currentUser.id, ...subClientIds];

      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .in('client_id', allClientIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching meetings:', error);
      } else {
        setMeetings(data || []);
      }
    } else {
      let query = supabase
        .from('meetings')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching meetings:', error);
      } else {
        setMeetings(data || []);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    if (propMeetings) {
      setMeetings(propMeetings);
      setLoading(false);
    } else {
      fetchSubClients();
      fetchMeetings();
    }
  }, [propMeetings]);

  const handleJoinMeeting = async (meetingId: string, password: string, meetingName: string) => {
    await joinZoomMeeting({
      meetingId,
      password,
      meetingName,
      userName: 'Junaid'
    });
  };

  const toggleAttended = async (meeting: Meeting) => {
    const { error } = await supabase
      .from('meetings')
      .update({ attended: !meeting.attended, updated_at: new Date().toISOString() })
      .eq('id', meeting.id);

    if (error) {
      console.error('Error updating meeting:', error);
    } else {
      setMeetings(meetings.map(m =>
        m.id === meeting.id ? { ...m, attended: !m.attended } : m
      ));
      if (onMeetingUpdated) {
        onMeetingUpdated();
      }
    }
  };

  const deleteMeeting = async (id: string) => {
    if (!confirm('Are you sure you want to delete this meeting?')) {
      return;
    }

    const meeting = meetings.find(m => m.id === id);

    const { error } = await supabase
      .from('meetings')
      .update({ status: 'deleted' })
      .eq('id', id);

    if (error) {
      console.error('Error deleting meeting:', error);
      alert('Failed to delete meeting: ' + error.message);
    } else {
      setMeetings(meetings.filter(m => m.id !== id));

      if (meeting?.scheduled_date && meeting?.client_name) {
        await supabase.rpc('calculate_daily_dues_for_client', {
          p_client_name: meeting.client_name,
          p_date: meeting.scheduled_date
        });
      }

      if (onMeetingUpdated) {
        onMeetingUpdated();
      }
    }
  };

  const getMinuteRange = (minutes: number) => {
    if (minutes >= 0 && minutes <= 15) return '15';
    if (minutes >= 16 && minutes <= 30) return '30';
    if (minutes >= 31 && minutes <= 45) return '45';
    return '60';
  };

  const openAllInStack = async (minuteStack: string) => {
    const stackMeetings = meetings.filter(m => {
      if (!m.hour || m.minutes === undefined) return false;
      const range = getMinuteRange(m.minutes);
      return range === minuteStack;
    });

    for (const meeting of stackMeetings) {
      await handleJoinMeeting(meeting.meeting_id, meeting.password, meeting.meeting_name);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  };

  const sortedMeetings = [...meetings].sort((a, b) => {
    if (a.attended !== b.attended) {
      return a.attended ? 1 : -1;
    }

    const hourA = (a.hour || 0) + (a.time_period === 'PM' ? 12 : 0);
    const hourB = (b.hour || 0) + (b.time_period === 'PM' ? 12 : 0);

    if (hourA !== hourB) {
      return hourB - hourA;
    }

    return (b.member_count || 0) - (a.member_count || 0);
  });

  const filteredMeetings = selectedTime === 'all'
    ? sortedMeetings
    : sortedMeetings.filter(m => {
        if (!m.hour || m.minutes === undefined) return false;
        const range = getMinuteRange(m.minutes);
        return range === selectedTime;
      });

  const timeSlots = ['15', '30', '45', '60'];

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className={`text-center py-16 rounded-2xl shadow-2xl border transition-all duration-300 ${
        isDark
          ? 'bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 border-gray-700/50'
          : 'bg-gradient-to-br from-white via-gray-50 to-white border-gray-200/50'
      }`}>
        <Video size={48} className={`mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
        <p className={`text-lg font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          No meetings saved yet
        </p>
        <p className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          Add your first meeting using the form
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 mb-5">
        <div className="flex items-center justify-between">
          <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Meetings
            <span className={`ml-2 text-lg font-normal ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              ({filteredMeetings.length})
            </span>
          </h2>

          <button
            onClick={() => setShowOpenAllModal(!showOpenAllModal)}
            className="px-4 py-2 text-sm font-bold rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <Video size={18} />
            Open All Meetings
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedTime('all')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg ${
              selectedTime === 'all'
                ? 'bg-slate-800 text-white'
                : isDark
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Times
          </button>
          {timeSlots.map((slot) => {
            const meetingsInSlot = meetings.filter(m => {
              if (!m.hour || m.minutes === undefined) return false;
              return getMinuteRange(m.minutes) === slot;
            }).length;

            return (
              <button
                key={slot}
                onClick={() => setSelectedTime(slot)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg ${
                  selectedTime === slot
                    ? 'bg-slate-800 text-white'
                    : isDark
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                :{slot} min ({meetingsInSlot})
              </button>
            );
          })}
        </div>
      </div>

      {showOpenAllModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-6 max-w-md w-full border-2 shadow-2xl`}>
            <h3 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Open All Meetings
            </h3>
            <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Select a time stack to open all meetings in that range:
            </p>
            <div className="grid grid-cols-2 gap-3">
              {timeSlots.map((slot) => {
                const meetingsInSlot = meetings.filter(m => {
                  if (!m.hour || m.minutes === undefined) return false;
                  return getMinuteRange(m.minutes) === slot;
                });

                let rangeLabel = '';
                if (slot === '15') rangeLabel = '00-15 min';
                if (slot === '30') rangeLabel = '16-30 min';
                if (slot === '45') rangeLabel = '31-45 min';
                if (slot === '60') rangeLabel = '46-60 min';

                return (
                  <button
                    key={slot}
                    onClick={() => {
                      openAllInStack(slot);
                      setShowOpenAllModal(false);
                    }}
                    disabled={meetingsInSlot.length === 0}
                    className={`p-4 rounded-xl font-bold text-center transition-all duration-300 ${
                      meetingsInSlot.length > 0
                        ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl cursor-pointer'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-2xl mb-1">:{slot}</div>
                    <div className="text-xs">{rangeLabel}</div>
                    <div className="text-sm mt-1">({meetingsInSlot.length} meetings)</div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowOpenAllModal(false)}
              className={`w-full mt-4 px-4 py-3 rounded-xl font-bold ${
                isDark
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              } transition-all duration-300`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}


      <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-2 custom-scrollbar">
        {filteredMeetings.map((meeting, idx) => {
          const cardColors = isDark
            ? [
                'bg-gradient-to-br from-blue-900/60 via-blue-800/60 to-cyan-900/60 border-blue-700/50',
                'bg-gradient-to-br from-emerald-900/60 via-teal-800/60 to-green-900/60 border-emerald-700/50',
                'bg-gradient-to-br from-orange-900/60 via-amber-800/60 to-yellow-900/60 border-orange-700/50',
                'bg-gradient-to-br from-rose-900/60 via-pink-800/60 to-red-900/60 border-rose-700/50',
                'bg-gradient-to-br from-violet-900/60 via-purple-800/60 to-fuchsia-900/60 border-violet-700/50'
              ]
            : [
                'bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 border-blue-300/60',
                'bg-gradient-to-br from-emerald-50 via-teal-50 to-green-100 border-emerald-300/60',
                'bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-100 border-orange-300/60',
                'bg-gradient-to-br from-rose-50 via-pink-50 to-red-100 border-rose-300/60',
                'bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-100 border-violet-300/60'
              ];
          const colorClass = cardColors[idx % cardColors.length];

          const isOwnMeeting = currentUser && meeting.client_id === currentUser.id;
          const subClient = subClients.find(sc => sc.id === meeting.client_id);

          return (
          <div
            key={meeting.id}
            className={`rounded-2xl shadow-lg p-4 hover:shadow-2xl transition-all duration-300 border ${colorClass} ${meeting.attended ? 'opacity-50' : ''} ${meeting.is_instant && !meeting.attended && (!meeting.screenshot_url || meeting.screenshot_url === '') ? 'flame-box' : ''}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className={`text-base font-bold truncate ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {meeting.meeting_name}
                  </h3>

                  {isOwnMeeting && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-blue-500 text-white rounded-full text-xs font-bold whitespace-nowrap">
                      Me
                    </span>
                  )}

                  {!isOwnMeeting && subClient && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-purple-500 text-white rounded-full text-xs font-bold whitespace-nowrap">
                      {subClient.name}
                    </span>
                  )}

                  {meeting.hour !== undefined && meeting.time_period && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 text-white rounded-lg text-xs font-bold whitespace-nowrap shadow-md">
                      <Clock size={12} />
                      {meeting.hour}{meeting.time_period}
                    </span>
                  )}

                  {meeting.member_count !== undefined && meeting.member_count > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-700 text-white rounded-lg text-xs font-bold whitespace-nowrap shadow-md">
                      <Users size={12} />
                      {meeting.member_count}
                    </span>
                  )}
                </div>

                <div className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span className="font-semibold">ID:</span> {meeting.meeting_id}
                  <span className="mx-2">•</span>
                  <span className="font-semibold">Pass:</span> {meeting.password}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleAttended(meeting)}
                  className={`p-2 rounded-xl border-2 transition-all duration-300 shadow-md hover:shadow-lg ${
                    meeting.attended
                      ? 'bg-green-600 border-green-600 text-white hover:bg-green-700'
                      : isDark
                      ? 'bg-gray-700 border-gray-600 text-gray-400 hover:border-green-600 hover:text-green-400'
                      : 'bg-white border-gray-300 text-gray-400 hover:border-green-600 hover:text-green-600'
                  }`}
                  title={meeting.attended ? 'Mark as not attended' : 'Mark as attended'}
                >
                  {meeting.attended ? (
                    <Check size={18} strokeWidth={3} />
                  ) : (
                    <Square size={18} />
                  )}
                </button>

                <button
                  onClick={() => handleJoinMeeting(meeting.meeting_id, meeting.password, meeting.meeting_name)}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-5 text-xs rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl flame-button"
                >
                  <Video size={16} />
                  Join
                </button>

                <button
                  onClick={() => deleteMeeting(meeting.id)}
                  className={`p-2 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg ${
                    isDark
                      ? 'text-red-400 hover:bg-red-900/30'
                      : 'text-red-500 hover:bg-red-50'
                  }`}
                  title="Delete meeting"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        );
        })}
      </div>
    </div>
  );
}
