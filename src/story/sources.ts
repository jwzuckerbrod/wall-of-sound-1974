import type { SourceId } from '../data/wall.config';

/** Short names for the config's sources, for the line under each beat. The full titles are in the credits. */
const SHORT: Record<SourceId, string> = {
  wiki: 'Wikipedia',
  mcintosh: 'McIntosh Laboratory',
  deadsources74: 'the 1974 spec sheet',
  deadsources22: 'Grateful Dead Sources, Sept. 1974',
  mixtest: 'Mix',
  mixrebuild: 'Mix',
  owsinski: 'Bobby Owsinski',
  mayberry: 'John Mayberry',
  relix: 'Relix',
  upa: 'Underground PA',
  mc2300: 'Wikipedia, MC-2300',
  syf: 'Wikipedia, Steal Your Face',
  bear: 'Owsley Stanley',
  pechner: 'Richard Pechner',
  photos: 'the 1974 photographs',
  anderson: 'Brian Anderson, Loud and Clear',
  schneider: 'Steve Schneider',
  sothebys: "Sotheby's 2021",
  blueprints: 'the 1974 scaffolding drawings',
  juliens: "Julien's Auctions 2026",
  tapes: "Rob Bertrando's tapes",
  duncan1982: 'Ben Duncan, 1982',
  pell: 'Becky Pell',
  coules2021: 'Andy Coules, 2021',
  kennedy2025: 'David K. Kennedy, 2025',
  derived: 'our derivations',
};

export const shortSource = (id: SourceId) => SHORT[id];
