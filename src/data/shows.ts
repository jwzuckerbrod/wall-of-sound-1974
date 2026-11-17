/**
 * Every show the Wall of Sound played, and where each can be heard from a
 * licensed service. One file feeds the Listen players, the list of shows and
 * (later) the map.
 *
 * Dates and venues: the Grateful Dead setlist list at cs.cmu.edu/~gdead/74.html,
 * checked against deaddisc.com's releases by recording date (both read
 * November 17, 2026). The count is wall.meta.showCount.
 *
 * Releases: deaddisc.com's list by recording date. Each Spotify id below was
 * found on Spotify itself on November 17, 2026 (US catalog), and the track
 * counts are Spotify's. A release without a Spotify id was searched for and not
 * found there. Apple Music links are not filled in yet.
 *
 * Play Dead (the band's own streaming service, by subscription): the ids in
 * PLAY_DEAD are its pages for single nights, read from its 1974 list while
 * signed in on November 17, 2026. A night without one was not in that list;
 * the Hollywood Bowl is one of them. Its list holds nights that no album does.
 *
 * Coordinates: each venue's, from its Wikipedia article (read November 17,
 * 2026). Three stand in: the University of Nevada show is placed at Mackay
 * Stadium, Adams Field House at Dahlberg Arena (the same building), and Dijon's
 * Parc des Expositions at the city's coordinates. `outdoors` marks the stadiums,
 * the fairgrounds and the Bowl, by the kind of venue.
 *
 * Europe: the Wall was set up at Alexandra Palace (an eyewitness on dead.net's
 * page for September 9; Steve Brown's Super 8 film, described by Ned Lagin as
 * showing "the Alexandra Palace set up of the Wall of Sound"; and amplifier
 * cases stenciled with inventory numbers "from a trip to Europe in 1974",
 * Sotheby's 2021, lot 37). How much of the system made the trip is not
 * established, so nothing here says the full Wall stood in Europe.
 */

export type ReleaseId =
  | 'dp24'
  | 'marsDeluxe'
  | 'dave9'
  | 'pnwComplete'
  | 'pnwBelieve'
  | 'roadTrips'
  | 'dave34'
  | 'dp12'
  | 'dave17'
  | 'dave2'
  | 'dp31'
  | 'dp7'
  | 'trips30'
  | 'steal'
  | 'movie';

export interface Release {
  title: string;
  /** Spotify album id. Absent: searched for and not found on Spotify. */
  spotify?: string;
  /** Not filled in yet. */
  appleMusic?: string;
}

export const RELEASES: Record<ReleaseId, Release> = {
  dp24: { title: "Dick's Picks Vol. 24", spotify: '4jiBYEFx7rv6C6UTYywZZO' },
  marsDeluxe: { title: 'From the Mars Hotel (50th Anniversary Deluxe Edition)', spotify: '17Em1ShnwvguCSeyNExYjX' },
  dave9: { title: "Dave's Picks Vol. 9" },
  pnwComplete: { title: "Pacific Northwest '73–'74: The Complete Recordings" },
  pnwBelieve: { title: "Pacific Northwest '73–'74: Believe It If You Need It", spotify: '3EUx54No5UpMca8zIyTpbd' },
  roadTrips: { title: 'Road Trips Vol. 2 No. 3 (in Complete Road Trips)', spotify: '2czauXV6n1W4DzaqW9w71j' },
  dave34: { title: "Dave's Picks Vol. 34" },
  dp12: { title: "Dick's Picks Vol. 12", spotify: '0B87pzzLQzyevvMvdcJqHZ' },
  dave17: { title: "Dave's Picks Vol. 17" },
  dave2: { title: "Dave's Picks Vol. 2" },
  dp31: { title: "Dick's Picks Vol. 31", spotify: '0EgV8QqWBeSt1U6MBK6NnC' },
  dp7: { title: "Dick's Picks Vol. 7", spotify: '2tDQBnR5OrbHg8mfGbetxf' },
  trips30: { title: '30 Trips Around the Sun: The Definitive Live Story', spotify: '5V0L9Vxiae3BTrFaQ4YDEi' },
  steal: { title: 'Steal Your Face', spotify: '5bjr91Bwltlkd6qSDm41my' },
  movie: { title: 'The Grateful Dead Movie Soundtrack', spotify: '3gSgdtj4KpCxaT0DcPfsex' },
};

export interface Heard {
  release: ReleaseId;
  /** How much of the show the release holds, in a few words. */
  holds: string;
}

export type Leg = 'The debut' | 'Spring, the West' | 'June, the East' | 'Summer' | 'Europe' | 'The last run';

export interface Show {
  /** ISO date. */
  date: string;
  /** For several nights at one venue that the releases don't tell apart: the last night. */
  to?: string;
  venue: string;
  city: string;
  leg: Leg;
  /** The venue: latitude and longitude. */
  at: [number, number];
  /** Played in the open air. Absent: in a hall. */
  outdoors?: true;
  heard: Heard[];
}

const PNW_BOX: Heard = { release: 'pnwComplete', holds: 'the complete show' };

/** In order. A row with `to` is a run of nights; SHOW_COUNT counts every night. */
export const SHOWS: Show[] = [
  { date: '1974-03-23', at: [37.7067, -122.4186], venue: 'Cow Palace', city: 'Daly City, California', leg: 'The debut', heard: [{ release: 'dp24', holds: 'most of the show' }] },

  { date: '1974-05-12', at: [39.5469, -119.8175], outdoors: true, venue: 'University of Nevada', city: 'Reno, Nevada', leg: 'Spring, the West', heard: [{ release: 'marsDeluxe', holds: '22 songs' }] },
  { date: '1974-05-14', at: [46.864, -113.983], venue: 'Adams Field House', city: 'Missoula, Montana', leg: 'Spring, the West', heard: [{ release: 'dave9', holds: 'the complete show' }] },
  { date: '1974-05-17', at: [49.2858, -123.0428], venue: 'P.N.E. Coliseum', city: 'Vancouver, British Columbia', leg: 'Spring, the West', heard: [{ release: 'pnwBelieve', holds: '2 songs' }, PNW_BOX] },
  { date: '1974-05-19', at: [45.5322, -122.6694], venue: 'Portland Memorial Coliseum', city: 'Portland, Oregon', leg: 'Spring, the West', heard: [{ release: 'pnwBelieve', holds: '7 songs' }, PNW_BOX] },
  { date: '1974-05-21', at: [47.652, -122.302], venue: 'Hec Edmundson Pavilion', city: 'Seattle, Washington', leg: 'Spring, the West', heard: [{ release: 'pnwBelieve', holds: '3 songs' }, PNW_BOX] },
  { date: '1974-05-25', at: [34.42, -119.854], outdoors: true, venue: 'Campus Stadium, UC Santa Barbara', city: 'Goleta, California', leg: 'Spring, the West', heard: [] },
  { date: '1974-06-08', at: [37.7517, -122.2006], outdoors: true, venue: 'Oakland Coliseum Stadium', city: 'Oakland, California', leg: 'Spring, the West', heard: [] },

  { date: '1974-06-16', at: [41.5953, -93.5494], outdoors: true, venue: 'State Fairgrounds', city: 'Des Moines, Iowa', leg: 'June, the East', heard: [{ release: 'roadTrips', holds: 'selections' }] },
  { date: '1974-06-18', at: [38.2003, -85.7419], venue: 'Freedom Hall', city: 'Louisville, Kentucky', leg: 'June, the East', heard: [{ release: 'roadTrips', holds: 'selections' }] },
  { date: '1974-06-20', at: [33.7575, -84.3967], venue: 'The Omni', city: 'Atlanta, Georgia', leg: 'June, the East', heard: [] },
  { date: '1974-06-22', at: [25.8073, -80.2568], venue: 'Jai-Alai Fronton', city: 'Miami, Florida', leg: 'June, the East', heard: [] },
  { date: '1974-06-23', at: [25.8073, -80.2568], venue: 'Jai-Alai Fronton', city: 'Miami, Florida', leg: 'June, the East', heard: [{ release: 'dave34', holds: 'the complete show' }] },
  { date: '1974-06-26', at: [41.8236, -71.4183], venue: 'Providence Civic Center', city: 'Providence, Rhode Island', leg: 'June, the East', heard: [{ release: 'dp12', holds: 'selections' }] },
  { date: '1974-06-28', at: [42.3658, -71.0617], venue: 'Boston Garden', city: 'Boston, Massachusetts', leg: 'June, the East', heard: [{ release: 'dp12', holds: 'selections' }] },
  { date: '1974-06-30', at: [42.1022, -72.5869], venue: 'Springfield Civic Center', city: 'Springfield, Massachusetts', leg: 'June, the East', heard: [] },

  { date: '1974-07-19', at: [36.7331, -119.7827], venue: 'Selland Arena', city: 'Fresno, California', leg: 'Summer', heard: [{ release: 'dave17', holds: 'the complete show' }] },
  { date: '1974-07-21', at: [34.1128, -118.3389], outdoors: true, venue: 'Hollywood Bowl', city: 'Los Angeles, California', leg: 'Summer', heard: [] },
  { date: '1974-07-25', at: [41.8161, -87.6461], venue: 'International Amphitheatre', city: 'Chicago, Illinois', leg: 'Summer', heard: [] },
  { date: '1974-07-27', at: [37.2802, -79.9357], venue: 'Roanoke Civic Center', city: 'Roanoke, Virginia', leg: 'Summer', heard: [] },
  { date: '1974-07-29', at: [38.9025, -76.8469], venue: 'Capital Centre', city: 'Landover, Maryland', leg: 'Summer', heard: [] },
  { date: '1974-07-31', at: [41.7538, -72.6611], outdoors: true, venue: 'Dillon Stadium', city: 'Hartford, Connecticut', leg: 'Summer', heard: [{ release: 'dave2', holds: 'nearly the complete show' }] },
  { date: '1974-08-04', at: [39.9474, -75.195], to: '1974-08-05', venue: 'Philadelphia Civic Center', city: 'Philadelphia, Pennsylvania', leg: 'Summer', heard: [{ release: 'dp31', holds: 'selections' }] },
  { date: '1974-08-06', at: [40.7064, -74.105], outdoors: true, venue: 'Roosevelt Stadium', city: 'Jersey City, New Jersey', leg: 'Summer', heard: [{ release: 'dp31', holds: 'selections' }] },

  { date: '1974-09-09', at: [51.5942, -0.1308], to: '1974-09-11', venue: 'Alexandra Palace', city: 'London, England', leg: 'Europe', heard: [{ release: 'dp7', holds: 'selections' }] },
  { date: '1974-09-14', at: [48.175, 11.55], venue: 'Olympiahalle', city: 'Munich, West Germany', leg: 'Europe', heard: [] },
  { date: '1974-09-18', at: [47.3167, 5.0167], venue: 'Parc des Expositions', city: 'Dijon, France', leg: 'Europe', heard: [{ release: 'trips30', holds: '1 song' }] },
  { date: '1974-09-20', at: [48.8325, 2.2861], to: '1974-09-21', venue: 'Palais des Sports', city: 'Paris, France', leg: 'Europe', heard: [] },

  { date: '1974-10-16', at: [37.785, -122.4349], to: '1974-10-20', venue: 'Winterland', city: 'San Francisco, California', leg: 'The last run', heard: [{ release: 'steal', holds: 'selections' }, { release: 'movie', holds: 'selections' }] },
];

/** Said with the European stops: see the note on Europe at the top of this file. */
export const EUROPE_NOTE = "The Wall was set up at Alexandra Palace. How much of it crossed the Atlantic isn't established.";

const nights = (s: Show) => (s.to ? Number(s.to.slice(-2)) - Number(s.date.slice(-2)) + 1 : 1);
/** Every night, counting the runs. Checked against wall.meta.showCount by `npm run verify`. */
export const SHOW_COUNT = SHOWS.reduce((n, s) => n + nights(s), 0);

/** Play Dead's page for a night, by its date: vault.playdead.app/release/<id>. */
export const PLAY_DEAD: Record<string, number> = {
  '1974-03-23': 47642,
  '1974-05-12': 47641,
  '1974-05-14': 47640,
  '1974-05-17': 47639,
  '1974-05-19': 47638,
  '1974-05-21': 47637,
  '1974-06-16': 47959,
  '1974-06-18': 48258,
  '1974-06-22': 47636,
  '1974-06-23': 47635,
  '1974-06-26': 48398,
  '1974-06-28': 48397,
  '1974-07-19': 47634,
  '1974-07-27': 49139,
  '1974-07-29': 47633,
  '1974-07-31': 47632,
  '1974-08-04': 47631,
  '1974-08-05': 47630,
  '1974-08-06': 47629,
  '1974-09-18': 47628,
  '1974-10-17': 49030,
  '1974-10-18': 49029,
  '1974-10-19': 49028,
  '1974-10-20': 49027,
};

/** The nights of a show that Play Dead holds, each with its link. */
export function playDeadNights(s: Show): { date: string; url: string }[] {
  const out: { date: string; url: string }[] = [];
  const last = Number((s.to ?? s.date).slice(-2));
  for (let d = Number(s.date.slice(-2)); d <= last; d++) {
    const date = `${s.date.slice(0, 8)}${String(d).padStart(2, '0')}`;
    if (PLAY_DEAD[date]) out.push({ date, url: `https://vault.playdead.app/release/${PLAY_DEAD[date]}` });
  }
  return out;
}

export const spotifyAlbumUrl = (id: string) => `https://open.spotify.com/album/${id}`;
export const spotifyTrackEmbed = (id: string) => `https://open.spotify.com/embed/track/${id}?theme=0`;

/**
 * What the Listen players play. The story is set at the Hollywood Bowl on
 * July 21, and no recording of that show has been released, so these are the
 * nearest released nights: Philadelphia, two weeks later (Dick's Picks Vol. 31).
 * Spotify labels all three "August 4-5, 1974" without saying which night.
 */
export const FEATURED = {
  release: 'dp31' as ReleaseId,
  venue: 'Philadelphia Civic Center',
  dates: 'August 4–5, 1974',
  tracks: [
    { title: 'Scarlet Begonias', spotify: '3N46cKTX78oOejAt9Amx6m' },
    { title: 'U.S. Blues', spotify: '0wXPDFLTY65V7PJoT9pbUz' },
    { title: 'Sugar Magnolia', spotify: '7F6laVeJpA0Z6JwPfhrZHc' },
  ],
};
