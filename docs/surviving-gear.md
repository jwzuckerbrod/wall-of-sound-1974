# Surviving Wall of Sound equipment

Equipment from the Wall that has come up at auction, with what each piece tells
the reconstruction. One row per lot. The reference photographs are in
`.shots/reference/` (not in the repo).

**Source.** Sotheby's, *From the Vault: Property from the Grateful Dead and
Friends*, New York, closed 14 October 2021 (`sothebys` in the config). Lots
34–50 are cataloged "Wall of Sound". Most lots carry a statement from "Big"
Steve Parish, the band's crew chief, which is the closest thing to a primary
account of what each piece did.

Sotheby's gives sizes in inches. For the amplifiers they are H × W × D. For
the cabinets the order varies from lot to lot, so each one was read off its
photographs and is given here as **W × H × D, face on**.

**How far these date.** Every piece was in service for years after 1974, and
the stickers, tape and labels pile up from the whole of that time: one amp has
a 1980 Alaska sticker, another tape dated 1993. The construction and the
equipment are evidence for 1974. The markings on them are not, except where
noted.

## Speaker cabinets

| Lot | What | Size W × H × D (in) | Owner, 2021 | What it shows |
|---|---|---|---|---|
| 50 | 1 × 15", "handmade at Alembic, ca. 1974". 15" JBL, heavy aluminum lugs, "53" on the back | **19 × 30 × 25.5** | Strider Shurtliff | **The 15" cabinet is a tall box, not a square.** A black baffle is recessed in a bare birch shell. The driver sits **low** on the baffle, clamped by four aluminum lugs at 45°, and the upper half is blank. |
| 46 | 1 × 15" bass cabinet, empty. Green spray-painted circle; "42" on the back | **19.5 × 29.5 × 25.5** | Grateful Dead Productions | The same design as lot 50, with the hole at the **top** of the baffle: the cabinet turned over. Bare birch, worn. |
| 47 | 2 × 12", two 12" JBLs, heavy aluminum brackets | **16 × 26 × 22** | Strider Shurtliff | Two 12"s **stacked vertically** in a tall, narrow box. Bare birch shell, black recessed baffle, lugs. |
| 48 | 2 × 12" closed back, used by Weir on stage, black cloth cover, crew doodles on top | 18 × 29 × 13 (reading unchecked) | Grateful Dead Productions | A shallow 2 × 12": a guitar cabinet, probably not part of the arrays. |
| 44 | 2 × 12", Weir on stage, black cloth grille | 28 × 13 × 16 (reading unchecked) | Grateful Dead Productions | Wide and low: a guitar cabinet. |
| 45 | 2 × 12", Garcia on stage, black painted ply, detachable cover | 28.5 × 14 × 15 (reading unchecked) | Grateful Dead Productions | As lot 44, painted black. |
| 49 | **Two curved aluminum enclosures from the center vocal cluster**, 7 of their 5" speakers left | each 69 long × 5.5 × 3.5 | Strider Shurtliff | Each is a channel bent to an arc with one row of about 13 holes for 5" speakers, about 5.3" apart. Parish: these replaced "the original 'fives' which were made of plywood and individually sandwiched in the first vocal cluster", once "we … had the right angle of the array down pat". So the cluster was first built from **individual plywood cells**, then from **curved aluminum strips**. When the change came is not stated. |

Common to every array cabinet: the catalogue's note that the crew built them at
Alembic, of birch ply, with "heavy lugs securing the speaker surrounds" so a
blown speaker could be swapped without damaging the cabinet.

**Against the model** (`CABINETS` in `src/data/wall.config.ts`):

- `cab15` is 24 × 24 × 22.5 with the driver centered. Lots 46 and 50 agree on
  about **19.25 × 29.75 × 25.5**, with the driver off-center. Those proportions,
  1 : 1.32 : 1.55, are close to the 2^(1/3) ratio the config documents
  (`cabinets.ratioRule`, 1 : 1.26 : 1.59), which the model doesn't use yet
  (`useCubeRootRule = false`).
- `cab12` is 15.5 × 24 × 22.5, one driver per cell. Lot 47 puts **two** 12"s in
  16 × 26 × 22, which comes to 13" of height per driver.
- `panel5` is 0.225 m (8.9") a cell. Lot 49's pitch is about 5.3".
- Bare birch shells with black recessed baffles and aluminum lugs are what
  `cabinets.construction` already describes for some of the cabinets.

None of these is applied yet: see *What to decide*.

## McIntosh MC 2300 amplifiers

All measure **10.5 × 19 × 17 in**, with an anodized gold and black panel.

| Lot | Serial | Parish: role in the Wall | Case | Front-panel markings |
|---|---|---|---|---|
| 36 "Budman" | 1Y460 | Garcia's guitar; "Jerry … played through it for years" | **Black** Anvil, "GRATEFUL DEAD" stencilled front and side; one-color skull-and-bolt stencilled on the back | Budweiser Bud Man sticker; "GARCIA" tape on the back; a backstage pass dated October 1972 on the back |
| 37 | 1Y649 | "the mid range vocal cluster, purchased in 1973" | Orange Anvil, Grateful Dead sticker, **"K18A" stencilled**: "an inventory number from a trip to Europe in 1974" | "1Y649" in marker; blank label below the meters |
| 38 | 1Y547 | the piano cluster | Orange Anvil; GD and skull-and-bolt stickers; tape "M-2"; "K25A", "2R"; "K14A" stencilled | **Metal skull-and-bolt emblem above the McIntosh badge**; tape "1008" below the meters; duct tape "M-10" |
| 39 | 1Y621 | "used in the Wall of Sound" | Orange Anvil, GD sticker, "K27A" | Tape "1009" below the meters; duct tape "M-7" above the badge; skull-and-bolt sticker below the badge; Hard Truckers Speakers sticker |
| 40 | ED010 | Weir's guitar | **White** Anvil, GD sticker, skull-and-bolt stickers on the lid | Tape "1011" below the meters; duct tape "M-9" |
| 41 | 1Y896 | "rack mounted for guitar amplification" | Orange Anvil, GD sticker | Tape "1010" below the meters; duct tape "M-3" above the badge; skull-and-bolt sticker below the badge; 1980 Alaska sticker |
| 42 | 1Y240 | the piano cluster | none | Tape "1003", upside down, below the meters |
| 43 | 1Y421 | "mid range vocals", later Garcia's extension speakers | Orange Anvil, GD and skull-and-bolt stickers | Tape dated 5/1/93; "Jet Fuel Only", "DR. MON" |

**Patterns worth modeling.** Nearly every amp has a white tape strip *below
the meters* carrying a four-digit number (1003–1011), and a strip of duct tape
with an "M-" number (M-2 to M-10) near the badge. The skull-and-bolt sits
*below the McIntosh badge*. Of the cased amps, five are in orange Anvil cases,
one white and one black.

**How many.** Parish (lots 34–36): "over 70 Mac 2300 amps powering the Wall";
lot 36 says "we bought 70 of them". The model has 48 (`structure.amps`, 12
racks of 4). See *What to decide*.

## Road cases

| Lot | What | Size (in) | What it shows |
|---|---|---|---|
| 34 | Purple ZERO case, custom made for one MC 2300. Metal, two-part, rubber seal and pressure-release valve. "ca. mid-1970s" | 19 × 21 × 20 | Parish: the first cases for the 2300s were three army-surplus military cases; ZERO then built copies, "painted with bright colors to identify them … as we were building the Wall of Sound". So these were in use *during* the Wall's time, unlike the Anvils, which can't be dated. A rounded painted cube with draw latches round a seam low on the case, and handles at the ends. |
| 35 | Orange ZERO case, as lot 34 | 19 × 21 × 20 | The same, in orange. |

## Decided (6 October 2026)

1. **15" cabinet**: now 19.5 × 25.5 × 29.5 in, driver low. Lot 46 read
   height × width × depth: the only reading that fits Pechner's photo. Lot 50's
   photograph suggests a 30"-high face, which would stack 16 high to 40 ft,
   taller than the tower. See `docs/qa-findings.md` §8.
2. **12" cabinet**: 16 × 13 × 22 in a driver, rows paired into 2 × 12" boxes.
3. **Vocal cluster**: first kept as individual cells, 5.5" high; then, on the
   Hollywood Bowl photographs of 21 July 1974 (`docs/qa-findings.md` §11),
   changed to lot 49's **aluminum strips**: 4 rows of 33 at 5.3", three lengths
   of 11 to a row, 132 drivers. The vocal fills give up 12 to keep the total.
4. **Amp count**: 48, with Parish's "over 70" noted in the config.
5. **Cases**: in the Blender scene, the amps stand in open-fronted rack cases
   (racks are what the 1974 photographs show on stage): mostly orange, one white,
   Budman's black. Most loose cases are now stacks of the amps' empty ZERO metal
   cases, orange and purple, with some Anvil trunks.
