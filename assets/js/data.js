// Bigfoot Truck Beds - product + fitment data (demo build, 10/18/26)
// FITMENT numbers are industry-standard replacement-bed sizes, cross-checked against
// Bedrock's live fitment JSON and Wil-Ro's chassis fit guide (research/01, /02).
// SERIES names, specs and "standard features" are DEMO PLACEHOLDERS for Drew and the
// truck-bed lead to replace with the shop's real build sheet. No prices are shown
// anywhere on purpose: Bigfoot has not set them yet.

window.BF = (function () {
  // ---------- Truck fitment ----------
  // Bed sizes keyed by chassis situation. width = deck width (SRW 84", DRW 97").
  const SIZES = {
    SB_SRW:  { key: 'SB_SRW',  label: "7' x 84\"",    length: 84,  width: 84, drw: false, ca: 'short bed (38-42\" CA)' },
    LB_SRW:  { key: 'LB_SRW',  label: "8'6\" x 84\"", length: 102, width: 84, drw: false, ca: 'long bed (56-58\" CA)' },
    LB_DRW:  { key: 'LB_DRW',  label: "8'6\" x 97\"", length: 102, width: 97, drw: true,  ca: 'long bed (56-58\" CA)' },
    CC60:    { key: 'CC60',    label: "9'4\" x 97\"", length: 112, width: 97, drw: true,  ca: '60\" CA cab & chassis' },
    CC84:    { key: 'CC84',    label: "11'4\" x 97\"",length: 136, width: 97, drw: true,  ca: '84\" CA cab & chassis' },
    CC108:   { key: 'CC108',   label: "14' x 97\"",   length: 168, width: 97, drw: true,  ca: '108\" CA cab & chassis' },
    CC120:   { key: 'CC120',   label: "16' x 97\"",   length: 192, width: 97, drw: true,  ca: '120\" CA cab & chassis' },
  };

  // Make -> model -> body choices. Short-bed CA per OEM: Ford 40", GM 42", Ram 38"; long bed 56-58".
  // Pickup frame-rail width (outside) per CM fitment: Ford 2017+ 42" (older 38", sources conflict, tape it), GM 42", Ram 2003+ 42".
  // Cab & chassis rails are 34" across all three OEMs. Receipts: research/03-fitment-data.md.
  const MAKES = [
    { key: 'ford', name: 'Ford', models: [
      { key: 'f250', name: 'F-250 Super Duty', years: '1999-current', frame: 42, bodies: ['SB_SRW', 'LB_SRW'] },
      { key: 'f350', name: 'F-350 Super Duty', years: '1999-current', frame: 42, bodies: ['SB_SRW', 'LB_SRW', 'LB_DRW', 'CC60', 'CC84'] },
      { key: 'f450', name: 'F-450 / F-550 chassis cab', years: '2008-current', frame: 34, bodies: ['CC60', 'CC84', 'CC108', 'CC120'] },
    ]},
    { key: 'gm', name: 'Chevrolet / GMC', models: [
      { key: 'c2500', name: 'Silverado / Sierra 2500 HD', years: '2001-current', frame: 42, bodies: ['SB_SRW', 'LB_SRW'] },
      { key: 'c3500', name: 'Silverado / Sierra 3500 HD', years: '2001-current', frame: 42, bodies: ['SB_SRW', 'LB_SRW', 'LB_DRW', 'CC60', 'CC84'] },
      { key: 'c4500', name: '4500 / 5500 HD chassis cab', years: '2019-current', frame: 34, bodies: ['CC60', 'CC84', 'CC108', 'CC120'] },
    ]},
    { key: 'ram', name: 'Ram', models: [
      { key: 'r2500', name: 'Ram 2500', years: '2003-current', frame: 42, bodies: ['SB_SRW', 'LB_SRW'] },
      { key: 'r3500', name: 'Ram 3500', years: '2003-current', frame: 42, bodies: ['SB_SRW', 'LB_SRW', 'LB_DRW', 'CC60', 'CC84'] },
      { key: 'r4500', name: 'Ram 4500 / 5500 chassis cab', years: '2008-current', frame: 34, bodies: ['CC60', 'CC84', 'CC108', 'CC120'] },
    ]},
  ];

  // What the buyer picks in plain words -> size key
  const BODIES = {
    SB_SRW: { label: 'Short bed, single rear wheel', help: 'Factory bed was about 6\'9". Measure cab to axle: 38-42 inches.' },
    LB_SRW: { label: 'Long bed, single rear wheel', help: 'Factory bed was 8 feet. Cab to axle: 56-58 inches.' },
    LB_DRW: { label: 'Long bed, dual rear wheel', help: 'Dually with the 8-foot bed pulled. Cab to axle: 56-58 inches.' },
    CC60:   { label: 'Cab & chassis, 60" cab to axle', help: 'Bare frame behind the cab. Most 1-ton chassis cabs.' },
    CC84:   { label: 'Cab & chassis, 84" cab to axle', help: 'The common 11-foot body chassis.' },
    CC108:  { label: 'Cab & chassis, 108" cab to axle', help: '14-foot body. 450/550, 4500/5500 class.' },
    CC120:  { label: 'Cab & chassis, 120" cab to axle', help: '16-foot body. Check rear overhang laws in your state.' },
  };

  // ---------- Bed series (DEMO names and specs - replace with the shop build sheet) ----------
  const SERIES = [
    {
      slug: 'track', name: 'Track', kicker: 'Open flatbed',
      forWho: 'Contractors, farms, anyone who wants a clean deck and nothing in the way.',
      blurb: 'The straight flatbed. Open sides, full stake pockets, rub rail all the way around. The bed you buy when you want the deck and your own boxes.',
      fits: ['SB_SRW', 'LB_SRW', 'LB_DRW', 'CC60', 'CC84', 'CC108', 'CC120'],
      base: { skirted: false, rack: 'tube', gooseneck: true, receiver: true, boxes: 0, overside: 0, lights: true, rubRail: true, deck: 'tread', bale: false },
      std: ['3/16" steel treadplate deck', '4" structural channel long sills', '3" channel crossmembers on 12" centers', 'Stake pockets and rub rail, full perimeter', 'Tube headache rack with window guard', 'Gooseneck ball plate and chain D-rings', '2" receiver tube at the rear', 'LED stop, turn, marker and ID lights', 'Painted finish, black'],
      opts: ['Smooth-plate deck', 'Mesh or solid headache rack', 'Under-body toolboxes', 'Over-the-side boxes', 'Rear work lights', 'Winch mount'],
      specs: { deck: '3/16"', sills: '4" channel', cross: '12" OC', gn: 'Ball plate' },
    },
    {
      slug: 'ridge', name: 'Ridge', kicker: 'Skirted flatbed',
      forWho: 'The daily truck. Ranch, service, hauling. Boxes built in, nothing hanging under the deck.',
      blurb: 'Skirted sides with built-in toolboxes behind the cab and over the wheels. The bed most people picture when they say truck bed.',
      fits: ['SB_SRW', 'LB_SRW', 'LB_DRW', 'CC60', 'CC84'],
      base: { skirted: true, rack: 'tube', gooseneck: true, receiver: true, boxes: 2, overside: 0, lights: true, rubRail: true, deck: 'tread', bale: false },
      std: ['3/16" steel treadplate deck', 'Full skirts with wheel-well caps', 'Two front under-body toolboxes, stainless paddle latches', '4" structural channel long sills', '3" channel crossmembers on 12" centers', 'Tube headache rack with window guard', 'Gooseneck ball plate and chain D-rings', '2" receiver tube at the rear', 'LED lighting, DOT compliant', 'Painted finish, black'],
      opts: ['Rear over-wheel boxes', 'Smooth-plate deck', 'Mesh or solid headache rack', 'Over-the-side boxes', 'Fuel-fill relocation', 'Rear work lights'],
      specs: { deck: '3/16"', sills: '4" channel', cross: '12" OC', boxes: '2 std' },
    },
    {
      slug: 'hauler', name: 'Hauler', kicker: 'Hotshot bed',
      forWho: 'Hotshot and gooseneck pullers. Built around the hitch, with the deck kept low and clear.',
      blurb: 'The bed that earns its keep behind a gooseneck. Heavy ball plate over the axle, rated receiver, boxes where the chains live, and a low deck so the neck clears.',
      fits: ['LB_SRW', 'LB_DRW', 'CC60', 'CC84'],
      base: { skirted: true, rack: 'solid', gooseneck: true, receiver: true, boxes: 2, overside: 0, lights: true, rubRail: true, deck: 'smooth', bale: false },
      std: ['Smooth 3/16" steel deck (low friction for the neck)', 'Heavy gooseneck ball plate, over-axle', 'Rated 2-1/2" receiver with chain loops', 'Solid headache rack with window cutout', 'Skirted sides with two front toolboxes', 'Trailer plug mounted at the rear, 7-way RV', 'LED lighting plus side ambers', 'Painted finish, black'],
      opts: ['Treadplate deck', 'Rear over-wheel boxes', 'Strap winches on the rub rail', 'Rear work lights', 'Backup camera relocation'],
      specs: { deck: '3/16"', gn: 'Over-axle', recv: '2-1/2"', rack: 'Solid' },
    },
    {
      slug: 'range', name: 'Range', kicker: 'Bale / arm bed',
      forWho: 'Cattle and hay. Pick up round bales from the cab, haul everything else the rest of the year.',
      blurb: 'A flatbed with hydraulic arms and spikes on the back. Load and unroll round bales without leaving the seat. Runs as a plain flatbed when the arms are up.',
      fits: ['LB_SRW', 'LB_DRW', 'CC60', 'CC84'],
      base: { skirted: false, rack: 'tube', gooseneck: true, receiver: true, boxes: 0, overside: 0, lights: true, rubRail: true, deck: 'tread', bale: true },
      std: ['Hydraulic bale arms with bale spikes', 'Electric-over-hydraulic pump, in-cab control', 'Treadplate deck with stake pockets', 'Gooseneck ball plate and 2" receiver', 'Tube headache rack', 'LED lighting', 'Painted finish, black'],
      opts: ['Spinner spikes for unrolling', 'Under-body toolboxes', 'Wireless remote', 'Rear work lights'],
      specs: { arms: 'Hydraulic', spikes: 'Std', deck: '3/16"', gn: 'Ball plate' },
    },
    {
      slug: 'crew', name: 'Crew', kicker: 'Service body',
      forWho: 'Mechanics, techs, utility crews. Everything in a box, nothing loose in the bed.',
      blurb: 'Full-height side compartments both sides, open center deck, headache rack ready for a ladder rack. The field-service truck.',
      fits: ['SB_SRW', 'LB_SRW', 'LB_DRW', 'CC60'],
      base: { skirted: true, rack: 'solid', gooseneck: false, receiver: true, boxes: 2, overside: 2, lights: true, rubRail: false, deck: 'tread', bale: false },
      std: ['Full-length side compartments, both sides', 'Stainless rotary latches, gas-strut doors', 'Treadplate center deck', 'Solid headache rack with window guard', '2" receiver tube', 'LED compartment and exterior lighting', 'Painted finish, black'],
      opts: ['Ladder rack', 'Gooseneck ball plate', 'Drawer units', 'Inverter and outlet package', 'Rear work lights'],
      specs: { boxes: '4 std', rack: 'Solid', deck: '3/16"', recv: '2"' },
    },
  ];

  // ---------- Options & accessories (configurator catalog) ----------
  const OPTIONS = {
    rack: [
      { key: 'tube', label: 'Tube rack', help: 'Open tube headache rack. Standard on most beds.' },
      { key: 'mesh', label: 'Mesh rack', help: 'Expanded-metal fill. Stops the small stuff.' },
      { key: 'solid', label: 'Solid rack', help: 'Plate rack with a window cutout. Hotshot favorite.' },
      { key: 'none', label: 'No rack', help: 'Deck only. Add your own later.' },
    ],
    deck: [
      { key: 'tread', label: 'Treadplate', help: 'Grip underfoot. The default.' },
      { key: 'smooth', label: 'Smooth plate', help: 'Easier to slide loads and sweep. Gooseneck pullers like it.' },
    ],
    boxes: [
      { key: 0, label: 'None' }, { key: 1, label: 'One side' }, { key: 2, label: 'Both sides' },
    ],
    overside: [
      { key: 0, label: 'None' }, { key: 1, label: 'One side' }, { key: 2, label: 'Both sides' },
    ],
    toggles: [
      { key: 'gooseneck', label: 'Gooseneck ball plate', help: 'Flush ball over the axle with chain D-rings.' },
      { key: 'receiver', label: 'Rear receiver', help: '2" receiver tube with safety-chain loops.' },
      { key: 'lights', label: 'LED light package', help: 'Stop, turn, marker, ID bar and side ambers.' },
      { key: 'rubRail', label: 'Rub rail and stake pockets', help: 'Tie down anywhere along the side.' },
    ],
    colors: [
      { key: 'black', label: 'Black', hex: '#1a1b1d' },
      { key: 'white', label: 'White', hex: '#dfe3e6' },
      { key: 'gray', label: 'Gray', hex: '#5a6066' },
      { key: 'yellow', label: 'Bigfoot Yellow', hex: '#d9b10b' },
    ],
  };

  const ACCESSORIES = [
    { group: 'Hitch and towing', items: [
      { name: 'Gooseneck ball plate', desc: 'Flush ball plate over the axle, chain D-rings each side.', fits: 'All flatbeds', ico: 'ball' },
      { name: 'Rated rear receiver', desc: '2" or 2-1/2" receiver tube welded into the rear crossmember.', fits: 'All beds', ico: 'receiver' },
      { name: '7-way trailer plug relocation', desc: 'RV-style plug moved to the rear plate, wired and tested.', fits: 'All beds', ico: 'plug' },
      { name: 'Strap winches', desc: 'Sliding ratchet winches on the rub rail for flat straps.', fits: 'Track, Hauler', ico: 'winch' },
    ]},
    { group: 'Storage', items: [
      { name: 'Under-body toolbox', desc: 'Steel box in the front skirt bay, stainless paddle latch, weather seal.', fits: 'Ridge, Hauler, Range', ico: 'box' },
      { name: 'Over-wheel box', desc: 'Rear skirt box behind the wheel well.', fits: 'Ridge, Hauler', ico: 'box' },
      { name: 'Over-the-side box', desc: 'Top-mount box on the deck edge behind the rack.', fits: 'Track, Ridge', ico: 'box' },
      { name: 'Drawer unit', desc: 'Slide-out drawers inside a side compartment.', fits: 'Crew', ico: 'drawer' },
    ]},
    { group: 'Racks and lighting', items: [
      { name: 'Headache rack, tube / mesh / solid', desc: 'Three styles, all with a window guard and cab-light mounts.', fits: 'All beds', ico: 'rack' },
      { name: 'Ladder rack', desc: 'Bolt-on rack from the headache rack to a rear post.', fits: 'Crew, Track', ico: 'ladder' },
      { name: 'Rear work lights', desc: 'Two LED floods on the rack, switched in the cab.', fits: 'All beds', ico: 'light' },
      { name: 'Backup camera relocation', desc: 'Factory camera moved to the rear plate so the screen still works.', fits: 'Take-off beds', ico: 'camera' },
    ]},
    { group: 'Deck and finish', items: [
      { name: 'Smooth-plate deck', desc: 'Swap treadplate for smooth plate.', fits: 'All flatbeds', ico: 'deck' },
      { name: 'Fuel-fill relocation', desc: 'Filler neck brought through the skirt with a lockable door.', fits: 'Skirted beds', ico: 'fuel' },
      { name: 'Mud flaps', desc: 'Heavy rubber flaps behind the wheels, dually width available.', fits: 'All beds', ico: 'flap' },
      { name: 'Color paint', desc: 'Black standard. White, gray, Bigfoot Yellow available.', fits: 'All beds', ico: 'paint' },
    ]},
  ];

  const FAQ = [
    { q: 'How do I know which bed fits my truck?', a: 'Three things decide it: single or dual rear wheel, whether the factory bed is still on (take-off) or it is a bare cab and chassis, and the cab-to-axle measurement. Use the fit finder on this page and it will tell you the size. If you want to measure yourself, run a tape from the back of the cab to the center of the rear axle hub.' },
    { q: 'What happens to my factory bed?', a: 'We pull it when the new bed goes on. You keep it, sell it, or we can help you move it. Take-off beds for newer trucks hold value.' },
    { q: 'Steel or aluminum?', a: 'Our beds are steel. Steel takes abuse, welds back together, and costs less. Aluminum saves weight and never rusts but dents and costs more. If you tow heavy or work the bed hard, steel.' },
    { q: 'Will my backup camera and tailgate lights still work?', a: 'Yes. Lights are rewired into the new bed as standard. The camera is an option we relocate to the rear plate so the factory screen keeps working.' },
    { q: 'How long does it take?', a: 'Build time depends on the queue and the options. Installation itself is usually a day. Call the shop for the current lead time before you plan around a date.' },
    { q: 'Where are the beds built?', a: 'In our shop in Mulberry, Florida, next to the trailer line. Same welders, same steel, same paint.' },
  ];

  // ---------- helpers ----------
  function sizeFor(bodyKey) { return SIZES[bodyKey]; }
  function seriesBySlug(s) { return SERIES.find(x => x.slug === s); }
  function seriesThatFit(bodyKey) { return SERIES.filter(s => s.fits.includes(bodyKey)); }
  function findModel(makeKey, modelKey) {
    const mk = MAKES.find(m => m.key === makeKey); if (!mk) return null;
    return mk.models.find(m => m.key === modelKey) || null;
  }
  // Build the 3D params for a series on a given size
  function params(series, size, overrides, model) {
    const p = Object.assign({}, series.base, {
      length: size.length, width: size.width, drw: size.drw, frameWidth: (model && model.frame) || (size.key.startsWith('CC') ? 34 : 42), truck: true, color: 'black',
    }, overrides || {});
    return p;
  }

  // Numeric cab-to-axle in inches, for the fitment drawing. Short-bed CA is
  // make-specific (Ford 40, GM 42, Ram 38 per research/03); long beds run
  // 56-58 so we draw 57; cab & chassis CA is the number in the key.
  function caInches(makeKey, bodyKey) {
    if (!bodyKey) return 57;
    if (bodyKey.slice(0, 2) === 'CC') return parseInt(bodyKey.slice(2), 10);
    if (bodyKey === 'SB_SRW') return ({ ford: 40, gm: 42, ram: 38 })[makeKey] || 40;
    return 57;
  }

  return { SIZES, MAKES, BODIES, SERIES, OPTIONS, ACCESSORIES, FAQ, sizeFor, seriesBySlug, seriesThatFit, findModel, params, caInches };
})();
