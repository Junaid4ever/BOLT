const MONEY_IN_SOUND = 'https://cdn.freesound.org/previews/634/634341_11861866-lq.mp3';
const MONEY_OUT_SOUND = 'https://cdn.freesound.org/previews/414/414517_6873981-lq.mp3';

export const playMoneyInSound = () => {
  try {
    const audio = new Audio(MONEY_IN_SOUND);
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch {}
};

export const playMoneyOutSound = () => {
  try {
    const audio = new Audio(MONEY_OUT_SOUND);
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch {}
};
