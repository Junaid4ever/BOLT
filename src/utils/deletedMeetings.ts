interface DeletedMeeting {
  id: string;
  meeting_name: string;
  meeting_id: string;
  password: string;
  client_name?: string;
  member_count?: number;
  deletedAt: string;
  deletedDate: string;
}

const DELETED_MEETINGS_KEY = 'recently_deleted_meetings';

export const getDeletedMeetings = (date: string): DeletedMeeting[] => {
  try {
    const stored = localStorage.getItem(DELETED_MEETINGS_KEY);
    if (!stored) return [];

    const allDeleted: DeletedMeeting[] = JSON.parse(stored);
    return allDeleted.filter(m => m.deletedDate === date);
  } catch {
    return [];
  }
};

export const addDeletedMeeting = (meeting: any, date: string) => {
  try {
    const stored = localStorage.getItem(DELETED_MEETINGS_KEY);
    const allDeleted: DeletedMeeting[] = stored ? JSON.parse(stored) : [];

    allDeleted.push({
      id: meeting.id,
      meeting_name: meeting.meeting_name,
      meeting_id: meeting.meeting_id,
      password: meeting.password,
      client_name: meeting.client_name,
      member_count: meeting.member_count,
      deletedAt: new Date().toISOString(),
      deletedDate: date
    });

    localStorage.setItem(DELETED_MEETINGS_KEY, JSON.stringify(allDeleted));
  } catch (e) {
    console.error('Failed to save deleted meeting:', e);
  }
};

export const restoreDeletedMeeting = (meetingId: string) => {
  try {
    const stored = localStorage.getItem(DELETED_MEETINGS_KEY);
    if (!stored) return null;

    const allDeleted: DeletedMeeting[] = JSON.parse(stored);
    const meeting = allDeleted.find(m => m.id === meetingId);

    if (meeting) {
      const filtered = allDeleted.filter(m => m.id !== meetingId);
      localStorage.setItem(DELETED_MEETINGS_KEY, JSON.stringify(filtered));
    }

    return meeting;
  } catch {
    return null;
  }
};

export const clearDeletedMeetingsForDate = (date: string) => {
  try {
    const stored = localStorage.getItem(DELETED_MEETINGS_KEY);
    if (!stored) return;

    const allDeleted: DeletedMeeting[] = JSON.parse(stored);
    const filtered = allDeleted.filter(m => m.deletedDate !== date);
    localStorage.setItem(DELETED_MEETINGS_KEY, JSON.stringify(filtered));
  } catch {}
};

export const clearOldDeletedMeetings = () => {
  try {
    const stored = localStorage.getItem(DELETED_MEETINGS_KEY);
    if (!stored) return;

    const today = new Date().toISOString().split('T')[0];
    const allDeleted: DeletedMeeting[] = JSON.parse(stored);
    const filtered = allDeleted.filter(m => m.deletedDate === today);
    localStorage.setItem(DELETED_MEETINGS_KEY, JSON.stringify(filtered));
  } catch {}
};
