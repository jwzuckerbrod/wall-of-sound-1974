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
 * found there. Apple Music and Play Dead links are not filled in yet.
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
  playDead?: string;
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
  heard: Heard[];
}

const PNW_BOX: Heard = { release: 'pnwComplete', holds: 'the complete show' };

/** In order. A row with `to` is a run of nights; SHOW_COUNT counts every night. */
export const SHOWS: Show[] = [
  { date: '1974-03-23', venue: 'Cow Palace', city: 'Daly City, California', leg: 'The debut', heard: [{ release: 'dp24', holds: 'most of the show' }] },

  { date: '1974-05-12', venue: 'University of Nevada', city: 'Reno, Nevada', leg: 'Spring, the West', heard: [{ release: 'marsDeluxe', holds: '22 songs' }] },
  { date: '1974-05-14', venue: 'Adams Field House', city: 'Missoula, Montana', leg: 'Spring, the West', heard: [{ release: 'dave9', holds: 'the complete show' }] },
  { date: '1974-05-17', venue: 'P.N.E. Coliseum', city: 'Vancouver, British Columbia', leg: 'Spring, the West', heard: [{ release: 'pnwBelieve', holds: '2 songs' }, PNW_BOX] },
  { date: '1974-05-19', venue: 'Portland Memorial Coliseum', city: 'Portland, Oregon', leg: 'Spring, the West', heard: [{ release: 'pnwBelieve', holds: '7 songs' }, PNW_BOX] },
  { date: '1974-05-21', venue: 'Hec Edmundson Pavilion', city: 'Seattle, Washington', leg: 'Spring, the West', heard: [{ release: 'pnwBelieve', holds: '3 songs' }, PNW_BOX] },
  { date: '1974-05-25', venue: 'Campus Stadium, UC Santa Barbara', city: 'Goleta, California', leg: 'Spring, the West', heard: [] },
  { date: '1974-06-08', venue: 'Oakland Coliseum Stadium', city: 'Oakland, California', leg: 'Spring, the West', heard: [] },

  { date: '1974-06-16', venue: 'State Fairgrounds', city: 'Des Moines, Iowa', leg: 'June, the East', heard: [{ release: 'roadTrips', holds: 'selections' }] },
  { date: '1974-06-18', venue: 'Freedom Hall', city: 'Louisville, Kentucky', leg: 'June, the East', heard: [{ release: 'roadTrips', holds: 'selections' }] },
  { date: '1974-06-20', venue: 'The Omni', city: 'Atlanta, Georgia', leg: 'June, the East', heard: [] },
  { date: '1974-06-22', venue: 'Jai-Alai Fronton', city: 'Miami, Florida', leg: 'June, the East', heard: [] },
  { date: '1974-06-23', venue: 'Jai-Alai Fronton', city: 'Miami, Florida', leg: 'June, the East', heard: [{ release: 'dave34', holds: 'the complete show' }] },
  { date: '1974-06-26', venue: 'Providence Civic Center', city: 'Providence, Rhode Island', leg: 'June, the East', heard: [{ release: 'dp12', holds: 'selections' }] },
  { date: '1974-06-28', venue: 'Boston Garden', city: 'Boston, Massachusetts', leg: 'June, the East', heard: [{ release: 'dp12', holds: 'selections' }] },
  { date: '1974-06-30', venue: 'Springfield Civic Center', city: 'Springfield, Massachusetts', leg: 'June, the East', heard: [] },

  { date: '1974-07-19', venue: 'Selland Arena', city: 'Fresno, California', leg: 'Summer', heard: [{ release: 'dave17', holds: 'the complete show' }] },
  { date: '1974-07-21', venue: 'Hollywood Bowl', city: 'Los Angeles, California', leg: 'Summer', heard: [] },
  { date: '1974-07-25', venue: 'International Amphitheatre', city: 'Chicago, Illinois', leg: 'Summer', heard: [] },
  { date: '1974-07-27', venue: 'Roanoke Civic Center', city: 'Roanoke, Virginia', leg: 'Summer', heard: [] },
  { date: '1974-07-29', venue: 'Capital Centre', city: 'Landover, Maryland', leg: 'Summer', heard: [] },
  { date: '1974-07-31', venue: 'Dillon Stadium', city: 'Hartford, Connecticut', leg: 'Summer', heard: [{ release: 'dave2', holds: 'nearly the complete show' }] },
  { date: '1974-08-04', to: '1974-08-05', venue: 'Philadelphia Civic Center', city: 'Philadelphia, Pennsylvania', leg: 'Summer', heard: [{ release: 'dp31', holds: 'selections' }] },
  { date: '1974-08-06', venue: 'Roosevelt Stadium', city: 'Jersey City, New Jersey', leg: 'Summer', heard: [{ release: 'dp31', holds: 'selections' }] },

  { date: '1974-09-09', to: '1974-09-11', venue: 'Alexandra Palace', city: 'London, England', leg: 'Europe', heard: [{ release: 'dp7', holds: 'selections' }] },
  { date: '1974-09-14', venue: 'Olympiahalle', city: 'Munich, West Germany', leg: 'Europe', heard: [] },
  { date: '1974-09-18', venue: 'Parc des Expositions', city: 'Dijon, France', leg: 'Europe', heard: [{ release: 'trips30', holds: '1 song' }] },
  { date: '1974-09-20', to: '1974-09-21', venue: 'Palais des Sports', city: 'Paris, France', leg: 'Europe', heard: [] },

  { date: '1974-10-16', to: '1974-10-20', venue: 'Winterland', city: 'San Francisco, California', leg: 'The last run', heard: [{ release: 'steal', holds: 'selections' }, { release: 'movie', holds: 'selections' }] },
];

const nights = (s: Show) => (s.to ? Number(s.to.slice(-2)) - Number(s.date.slice(-2)) + 1 : 1);
/** Every night, counting the runs. Checked against wall.meta.showCount by `npm run verify`. */
export const SHOW_COUNT = SHOWS.reduce((n, s) => n + nights(s), 0);

export const spotifyAlbumUrl = (id: string) => `https://open.spotify.com/album/${id}`;
export const spotifyTrackUrl = (id: string) => `https://open.spotify.com/track/${id}`;
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
