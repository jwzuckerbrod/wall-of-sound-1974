import { useSyncExternalStore } from 'react';

/**
 * The one audio element behind every player on a page. Song rows and the
 * now-playing bar are remotes for it, so they always agree, only one thing
 * plays at a time, and the sound outlives whichever row started it.
 *
 * Nothing is fetched until someone presses play. Each row keeps its place
 * while another plays; a row's two recordings share a place (the A/B switch).
 */

export interface PlayerItem {
  /** The row: one id for both recordings of a pair. */
  id: string;
  src: string;
  title: string;
  /** Which recording: shown under the title and on the lock screen. */
  detail: string;
}

export interface Place {
  time: number;
  length: number;
}

export interface PlayerState {
  item: PlayerItem | null;
  playing: boolean;
  loading: boolean;
  failed: boolean;
  places: Record<string, Place>;
}

export const NO_PLACE: Place = { time: 0, length: NaN };

let state: PlayerState = { item: null, playing: false, loading: false, failed: false, places: {} };
const listeners = new Set<() => void>();
let audio: HTMLAudioElement | null = null;
/** The place to go to once a new recording's length is known. Until then the element's own clock reads 0. */
let pendingTime: number | null = null;

function set(patch: Partial<PlayerState>) {
  state = { ...state, ...patch };
  listeners.forEach((f) => f());
}

function setPlace(patch: Partial<Place>) {
  const id = state.item?.id;
  if (!id) return;
  set({ places: { ...state.places, [id]: { ...(state.places[id] ?? NO_PLACE), ...patch } } });
}

function element(): HTMLAudioElement {
  if (audio) return audio;
  const a = new Audio();
  a.preload = 'none';
  const on = (e: string, f: () => void) => a.addEventListener(e, f);
  on('play', () => set({ playing: true, failed: false }));
  on('pause', () => set({ playing: false }));
  on('ended', () => set({ playing: false }));
  on('timeupdate', () => {
    if (pendingTime === null) setPlace({ time: a.currentTime });
  });
  on('durationchange', () => setPlace({ length: a.duration }));
  on('waiting', () => set({ loading: true }));
  on('playing', () => set({ loading: false }));
  on('canplay', () => set({ loading: false }));
  on('error', () => {
    if (a.getAttribute('src')) set({ loading: false, playing: false, failed: true });
  });
  // Carry the row's place over to a newly loaded recording.
  on('loadedmetadata', () => {
    if (pendingTime) a.currentTime = Math.min(pendingTime, Math.max(0, a.duration - 1));
    pendingTime = null;
  });
  audio = a;
  mediaSessionHandlers(a);
  return a;
}

/** Point the element at an item. Called from the click, so phones allow the play that follows. */
function load(item: PlayerItem) {
  const a = element();
  set({ item, failed: false });
  pendingTime = state.places[item.id]?.time ?? 0;
  a.src = item.src;
  showOnLockScreen(item);
}

function play() {
  const a = element();
  set({ loading: true });
  a.play().catch(() => set({ loading: false }));
}

export const player = {
  /** Play or pause this row. */
  toggle(item: PlayerItem) {
    const a = element();
    if (state.item?.id !== item.id || state.item.src !== item.src) {
      load(item);
      play();
    } else if (a.paused) play();
    else a.pause();
  },
  /** The bar's button: play or pause whatever is loaded. */
  togglePlaying() {
    if (state.item) player.toggle(state.item);
  },
  /** The A/B switch: same place in the other recording, and it carries on if it was playing. */
  swap(item: PlayerItem) {
    if (state.item?.id !== item.id || state.item.src === item.src) return;
    const resume = !element().paused;
    load(item);
    setPlace({ length: NaN });
    if (resume) play();
  },
  /** Move a row's place, whether or not it is the one loaded. */
  seek(id: string, fraction: number) {
    const place = state.places[id];
    const length = place?.length;
    if (!length || !Number.isFinite(length)) return;
    const time = fraction * length;
    if (state.item?.id === id && audio) {
      if (pendingTime === null) audio.currentTime = time;
      else pendingTime = time;
    }
    set({ places: { ...state.places, [id]: { ...place, time } } });
  },
  /** Stop the sound and put the bar away. Each row's place is kept. */
  close() {
    if (audio) {
      audio.pause();
      pendingTime = null;
      audio.removeAttribute('src');
      audio.load();
    }
    set({ item: null, playing: false, loading: false, failed: false });
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
  },
};

function showOnLockScreen(item: PlayerItem) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: item.title,
    artist: 'Grateful Dead',
    album: item.detail,
    artwork: [{ src: new URL(`${import.meta.env.BASE_URL}og.jpg`, location.href).href, type: 'image/jpeg' }],
  });
}

function mediaSessionHandlers(a: HTMLAudioElement) {
  if (!('mediaSession' in navigator)) return;
  const session = navigator.mediaSession;
  session.setActionHandler('play', () => void a.play());
  session.setActionHandler('pause', () => a.pause());
  session.setActionHandler('seekto', (e) => {
    if (e.seekTime !== undefined) a.currentTime = e.seekTime;
  });
}

const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => listeners.delete(f);
};

export function usePlayer(): PlayerState {
  return useSyncExternalStore(subscribe, () => state);
}

export const clock = (s: number) =>
  Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '–:––';

export const PLAY_ICON = 'M4.5 2.6v10.8a.6.6 0 0 0 .9.5l8.6-5.4a.6.6 0 0 0 0-1L5.4 2.1a.6.6 0 0 0-.9.5z';
