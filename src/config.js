// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Configuration & Constants
// ═══════════════════════════════════════════════════════════════

export const TILE_W = 64;
export const TILE_H = 32;
export const WALL_H = 44;
export const MAP_W = 50;
export const MAP_H = 44;

// Starting conditions
export const START_MONEY = 10000;
export const WIN_REVENUE = 1000000;
export const BANKRUPTCY_THRESHOLD = -5000;

// ─── Room costs (per day rent) ─────────────────────────────
export const ROOM_COSTS = {
  seo:        25,
  content:    25,
  video:      35,
  design:     30,
  data:       40,
  support:    20,
  sales:      25,
  engineering: 40,
  workshop:   30,
  marketing:  35,
  pr:         25,
  hr:         15,
  finance:    20,
  legal:      25,
  it:         35,
  rd:         45,
  warehouse:  10,
  breakroom:  10,
  meeting:    15,
  lobby:       0,
};

// ─── Agent salaries (per day) ──────────────────────────────
export const AGENT_SALARY = {
  ceo:            0,
  seo_analyst:    80,
  content_writer: 70,
  video_creator:  90,
  designer:       85,
  data_analyst:   95,
  support_agent:  60,
  sales_rep:      75,
  engineer:      100,
  craftsman:      75,
  marketer:       85,
  pr_specialist:  80,
  hr_manager:     65,
  accountant:     70,
  lawyer:         90,
  it_admin:       80,
  researcher:     95,
  warehouse_mgr:  55,
};

export const HIRE_COST = 800;

// ─── Alignment System ──────────────────────────────────────
export const ALIGNMENT = {
  new_hire_min: 0.10,       // new hires start very low
  new_hire_max: 0.30,       // max starting alignment
  decay_per_day: 0.008,     // daily natural decay (need regular meetings)
  decay_team_size_factor: 0.002, // extra decay per team member (bigger teams drift faster)
  standup_boost: 0.08,      // weekly standup alignment gain
  team_building_boost: 0.15, // CEO team building alignment gain
  team_building_ticks: 180,  // how long team building takes (game ticks)
  meeting_efficiency_penalty: 0.0, // agents in meetings produce 0 work
  misalignment_waste_threshold: 0.35, // below this, agents waste time
  misalignment_quit_threshold: 0.20,  // below this + low motivation → quit risk
  efficiency_bonus_max: 0.15, // max efficiency bonus at full alignment
  efficiency_penalty_max: 0.30, // max efficiency penalty at 0 alignment
  quality_bonus_max: 0.10,   // max quality bonus at full alignment
};

export const SPEECH_MISALIGNED = [
  'Wait, what are we building again?',
  'I thought we were doing something else...',
  'Are we all on the same page?',
  'This doesn\'t match what I was told...',
  'I\'m confused about priorities...',
  'Working on... something?',
  'Did the plan change?',
];

export const SPEECH_ALIGNED = [
  'We\'re all rowing in the same direction! 🎯',
  'Team is in sync!',
  'Crystal clear on priorities!',
  'Great alignment, great results!',
  'Everyone knows the plan!',
];

export const SPEECH_TEAM_BUILDING = [
  'Team building time! 🎳',
  'Getting the team aligned!',
  'Let\'s get on the same page!',
  'Vision alignment session!',
  'Trust exercises! 🤝',
];

export const SPEECH_QUIT_MISALIGNED = [
  'I don\'t even know what we\'re doing anymore. I\'m out.',
  'This team has no direction. Bye.',
  'I can\'t work like this. Good luck.',
];

// ─── Agent Seniority Tiers ───────────────────────────────
export const SENIORITY_LEVELS = {
  1: { label: 'Junior',  skillRange: [0.20, 0.40], salaryMult: 0.70, spawnWeight: 30 },
  2: { label: 'Medior',  skillRange: [0.35, 0.55], salaryMult: 0.85, spawnWeight: 35 },
  3: { label: 'Mid',     skillRange: [0.50, 0.70], salaryMult: 1.00, spawnWeight: 20 },
  4: { label: 'Senior',  skillRange: [0.65, 0.85], salaryMult: 1.25, spawnWeight: 10 },
  5: { label: 'Expert',  skillRange: [0.80, 0.95], salaryMult: 1.50, spawnWeight: 5  },
};

export function seniorityStars(level) {
  return '★'.repeat(level) + '☆'.repeat(5 - level);
}

// ─── Economy parameters ────────────────────────────────────
export const ECONOMY = {
  base_cpc: 2.50,
  base_website_cr: 0.03,
  base_close_rate: 0.15,
  sales_capacity_per_eff: 0.5,   // deals/day per 1.0 total sales efficiency
  no_sales_capacity: 0.02,       // background inbound without dedicated sales
  marketing_power_divisor: 220,  // converts budget into GTM power
  delivery_gtm_ratio: 0.5,       // required GTM power vs delivery efficiency
  reputation_organic_factor: 2.0,
  starting_reputation: 35,
  grace_period_days: 7,
  content_organic_factor: 20,
  seo_organic_factor: 15,
  design_quality_cr_boost: 1.5,
  content_quality_cr_boost: 1.0,
  meeting_room_close_boost: 1.2,
  day_ticks: 600,         // ticks per game day
  week_days: 5,           // business days per week
  sales_deal_bonus: 0.15,        // +15% pay for sales-closed deals
  no_sales_flow_rate: 0.30,      // only 30% of clients become projects without Sales
  support_rep_decay: 0.3,        // reputation decay per day without Support
  support_rep_gain: 0.1,         // reputation gain per day with Support
};

// ─── Cross-office synergy definitions ────────────────────────
export const OFFICE_SYNERGIES = {
  content: [
    { requires: 'design', bonus: 0.10, label: 'Design assets' },
    { requires: 'seo',    bonus: 0.10, label: 'SEO optimization' },
  ],
  design: [
    { requires: 'content', bonus: 0.10, label: 'Content brief' },
  ],
  video: [
    { requires: 'design',  bonus: 0.15, label: 'Motion graphics' },
    { requires: 'content', bonus: 0.10, label: 'Script quality' },
  ],
  seo: [
    { requires: 'content', bonus: 0.15, label: 'Content-driven SEO' },
    { requires: 'data',    bonus: 0.10, label: 'Data insights' },
  ],
  sales: [
    { requires: 'design',  bonus: 0.15, label: 'Polished decks' },
  ],
  engineering: [
    { requires: 'design',  bonus: 0.10, label: 'UI/UX design' },
    { requires: 'data',    bonus: 0.10, label: 'Data pipeline' },
  ],
  workshop: [
    { requires: 'design',      bonus: 0.15, label: 'Design specs' },
    { requires: 'engineering',  bonus: 0.10, label: 'CAD models' },
  ],
  marketing: [
    { requires: 'content', bonus: 0.15, label: 'Content assets' },
    { requires: 'design',  bonus: 0.10, label: 'Visual branding' },
  ],
  pr: [
    { requires: 'content', bonus: 0.10, label: 'Story angles' },
  ],
};

// ─── Office type definitions ───────────────────────────────
export const OFFICE_TYPES = {
  seo: {
    name: 'SEO Office', icon: '🔍', accent: '#50b868',
    accentRGB: [80,184,104], floorBase: [62,72,58], wallBase: [75,90,70], floorPattern: 'carpet',
    size: { w: 7, h: 5 }, cost: 1500,
    furniture: [
      { type: 'desk', lx: 1, ly: 1 },
      { type: 'monitor', lx: 2, ly: 1, screens: 3 },
      { type: 'chair', lx: 1, ly: 2 },
      { type: 'monitor', lx: 4, ly: 1, screens: 2, interactive: true, configKey: 'seo_keywords', label: 'Keyword Strategy' },
      { type: 'chair', lx: 4, ly: 2 },
      { type: 'shelf', lx: 0, ly: 0 },
      { type: 'whiteboard', lx: 5, ly: 0, interactive: true, configKey: 'seo_focus', label: 'SEO Focus' },
      { type: 'plant', lx: 6, ly: 4 },
    ],
    workTiles: [[2, 2], [5, 2], [3, 3]],
  },
  content: {
    name: 'Content Studio', icon: '✍️', accent: '#9068d0',
    accentRGB: [144,104,208], floorBase: [62,56,72], wallBase: [80,70,95], floorPattern: 'carpet',
    size: { w: 7, h: 5 }, cost: 1200,
    furniture: [
      { type: 'desk', lx: 1, ly: 1 },
      { type: 'monitor', lx: 2, ly: 1, screens: 1 },
      { type: 'chair', lx: 1, ly: 2 },
      { type: 'bookshelf', lx: 0, ly: 0, interactive: true, configKey: 'content_research', label: 'Research Depth' },
      { type: 'bookshelf', lx: 0, ly: 3 },
      { type: 'desk', lx: 4, ly: 2 },
      { type: 'monitor', lx: 4, ly: 1, screens: 1, interactive: true, configKey: 'content_style', label: 'Content Style' },
      { type: 'chair', lx: 4, ly: 3 },
      { type: 'whiteboard', lx: 5, ly: 0 },
      { type: 'plant', lx: 6, ly: 4 },
    ],
    workTiles: [[2, 2], [5, 3], [3, 3]],
  },
  video: {
    name: 'Video Studio', icon: '🎬', accent: '#e07030',
    accentRGB: [224,112,48], floorBase: [72,60,50], wallBase: [95,78,65], floorPattern: 'lab',
    size: { w: 7, h: 5 }, cost: 2000,
    furniture: [
      { type: 'greenscreen', lx: 5, ly: 1, interactive: true, configKey: 'video_effects', label: 'Visual Effects' },
      { type: 'greenscreen', lx: 5, ly: 2 },
      { type: 'greenscreen', lx: 5, ly: 3 },
      { type: 'camera', lx: 3, ly: 2, interactive: true, configKey: 'video_quality', label: 'Production Quality' },
      { type: 'softbox', lx: 1, ly: 1 },
      { type: 'ringlight', lx: 1, ly: 3 },
      { type: 'plant', lx: 0, ly: 0 },
      { type: 'crate', lx: 6, ly: 4 },
    ],
    workTiles: [[4, 2], [2, 3], [3, 3]],
  },
  design: {
    name: 'Design Studio', icon: '🎨', accent: '#d058a0',
    accentRGB: [208,88,160], floorBase: [72,56,64], wallBase: [95,72,85], floorPattern: 'wood',
    size: { w: 7, h: 5 }, cost: 1800,
    furniture: [
      { type: 'desk', lx: 1, ly: 1 },
      { type: 'monitor', lx: 2, ly: 1, screens: 2 },
      { type: 'chair', lx: 1, ly: 2 },
      { type: 'tablet', lx: 4, ly: 1, interactive: true, configKey: 'design_style', label: 'Design Style' },
      { type: 'chair', lx: 4, ly: 2 },
      { type: 'shelf', lx: 0, ly: 0 },
      { type: 'colorwall', lx: 5, ly: 0, interactive: true, configKey: 'design_palette', label: 'Color Palette' },
      { type: 'plant', lx: 5, ly: 3 },
    ],
    workTiles: [[2, 2], [5, 2], [3, 3]],
  },
  data: {
    name: 'Data Lab', icon: '📊', accent: '#4090e0',
    accentRGB: [64,144,224], floorBase: [50,58,72], wallBase: [65,75,95], floorPattern: 'lab',
    size: { w: 7, h: 5 }, cost: 2500,
    furniture: [
      { type: 'server', lx: 0, ly: 0, interactive: true, configKey: 'data_server', label: 'Analytics Dashboard' },
      { type: 'server', lx: 0, ly: 1 },
      { type: 'desk', lx: 2, ly: 1 },
      { type: 'monitor', lx: 3, ly: 1, screens: 3 },
      { type: 'chair', lx: 2, ly: 2 },
      { type: 'desk', lx: 5, ly: 2 },
      { type: 'monitor', lx: 5, ly: 1, screens: 2, interactive: true, configKey: 'data_monitor', label: 'Full Metrics' },
      { type: 'chair', lx: 5, ly: 3 },
      { type: 'plant', lx: 6, ly: 0 },
    ],
    workTiles: [[3, 2], [6, 3], [4, 3]],
  },
  support: {
    name: 'Support Center', icon: '🎧', accent: '#40b0b0',
    accentRGB: [64,176,176], floorBase: [50,68,68], wallBase: [65,88,88], floorPattern: 'tile',
    size: { w: 7, h: 5 }, cost: 1000,
    furniture: [
      { type: 'desk', lx: 1, ly: 1 },
      { type: 'monitor', lx: 2, ly: 1, screens: 2 },
      { type: 'chair', lx: 1, ly: 2 },
      { type: 'desk', lx: 4, ly: 1 },
      { type: 'monitor', lx: 4, ly: 1, screens: 1, interactive: true, configKey: 'support_templates', label: 'Response Templates' },
      { type: 'chair', lx: 4, ly: 2 },
      { type: 'ticketboard', lx: 0, ly: 0, interactive: true, configKey: 'support_sla', label: 'SLA Target' },
      { type: 'plant', lx: 5, ly: 3 },
      { type: 'plant', lx: 0, ly: 3 },
    ],
    workTiles: [[2, 2], [5, 2], [3, 3]],
  },
  sales: {
    name: 'Sales Office', icon: '💼', accent: '#e0a030',
    accentRGB: [224,160,48], floorBase: [72,64,50], wallBase: [95,85,65], floorPattern: 'carpet',
    size: { w: 7, h: 5 }, cost: 1500,
    furniture: [
      { type: 'desk', lx: 1, ly: 1 },
      { type: 'monitor', lx: 2, ly: 1, screens: 2 },
      { type: 'chair', lx: 1, ly: 2 },
      { type: 'desk', lx: 4, ly: 1 },
      { type: 'monitor', lx: 4, ly: 1, screens: 1, interactive: true, configKey: 'sales_followup', label: 'Follow-up Intensity' },
      { type: 'chair', lx: 4, ly: 2 },
      { type: 'whiteboard', lx: 0, ly: 0, interactive: true, configKey: 'sales_pricing', label: 'Pricing Strategy' },
      { type: 'bigtv', lx: 6, ly: 0, interactive: true, configKey: 'sales_commission', label: 'Commission Rate' },
      { type: 'plant', lx: 6, ly: 4 },
    ],
    workTiles: [[2, 2], [5, 2], [3, 3]],
  },
  engineering: {
    name: 'Engineering Lab', icon: '⚙️', accent: '#5090c0',
    accentRGB: [80,144,192], floorBase: [52,60,70], wallBase: [68,78,92], floorPattern: 'lab',
    size: { w: 7, h: 5 }, cost: 2800,
    furniture: [
      { type: 'server', lx: 0, ly: 0 },
      { type: 'monitor', lx: 2, ly: 1, screens: 3 },
      { type: 'desk', lx: 1, ly: 1 },
      { type: 'chair', lx: 1, ly: 2 },
      { type: 'desk', lx: 4, ly: 1 },
      { type: 'monitor', lx: 4, ly: 1, screens: 2, interactive: true, configKey: 'eng_methodology', label: 'Dev Methodology' },
      { type: 'chair', lx: 4, ly: 2 },
      { type: 'whiteboard', lx: 5, ly: 0, interactive: true, configKey: 'eng_stack', label: 'Tech Stack' },
    ],
    workTiles: [[2, 2], [5, 2], [3, 3]],
  },
  workshop: {
    name: 'Workshop', icon: '🔧', accent: '#8b6c42',
    accentRGB: [139,108,66], floorBase: [66,58,48], wallBase: [86,76,62], floorPattern: 'concrete',
    size: { w: 7, h: 5 }, cost: 1800,
    furniture: [
      { type: 'crate', lx: 0, ly: 0 },
      { type: 'crate', lx: 0, ly: 1 },
      { type: 'table', lx: 2, ly: 1, interactive: true, configKey: 'workshop_quality', label: 'Build Quality' },
      { type: 'shelf', lx: 5, ly: 0, interactive: true, configKey: 'workshop_tools', label: 'Tool Grade' },
      { type: 'desk', lx: 4, ly: 2 },
      { type: 'chair', lx: 4, ly: 3 },
      { type: 'plant', lx: 6, ly: 4 },
    ],
    workTiles: [[3, 2], [5, 3], [2, 3]],
  },
  marketing: {
    name: 'Marketing HQ', icon: '📣', accent: '#c05080',
    accentRGB: [192,80,128], floorBase: [70,54,62], wallBase: [92,70,82], floorPattern: 'carpet',
    size: { w: 7, h: 5 }, cost: 2000,
    furniture: [
      { type: 'monitor', lx: 2, ly: 1, screens: 2 },
      { type: 'desk', lx: 1, ly: 1 },
      { type: 'chair', lx: 1, ly: 2 },
      { type: 'desk', lx: 4, ly: 1 },
      { type: 'monitor', lx: 4, ly: 1, screens: 2, interactive: true, configKey: 'marketing_channel', label: 'Channel Focus' },
      { type: 'chair', lx: 4, ly: 2 },
      { type: 'whiteboard', lx: 5, ly: 0 },
      { type: 'bigtv', lx: 6, ly: 0, interactive: true, configKey: 'marketing_spend', label: 'Ad Spend Level' },
    ],
    workTiles: [[2, 2], [5, 2], [3, 3]],
  },
  pr: {
    name: 'PR Office', icon: '📰', accent: '#70a050',
    accentRGB: [112,160,80], floorBase: [56,66,52], wallBase: [72,86,66], floorPattern: 'carpet',
    size: { w: 7, h: 5 }, cost: 1500,
    furniture: [
      { type: 'desk', lx: 1, ly: 1 },
      { type: 'monitor', lx: 2, ly: 1, screens: 1 },
      { type: 'chair', lx: 1, ly: 2 },
      { type: 'couch', lx: 4, ly: 0, interactive: true, configKey: 'pr_approach', label: 'PR Approach' },
      { type: 'bookshelf', lx: 0, ly: 0 },
      { type: 'plant', lx: 5, ly: 3 },
    ],
    workTiles: [[2, 2], [5, 2], [3, 3]],
  },
  hr: {
    name: 'HR Office', icon: '👥', accent: '#9080c0',
    accentRGB: [144,128,192], floorBase: [58,56,66], wallBase: [76,72,88], floorPattern: 'carpet',
    size: { w: 7, h: 4 }, cost: 1200,
    furniture: [
      { type: 'desk', lx: 1, ly: 1 },
      { type: 'monitor', lx: 2, ly: 1, screens: 1 },
      { type: 'chair', lx: 1, ly: 2 },
      { type: 'shelf', lx: 0, ly: 0 },
      { type: 'couch', lx: 4, ly: 0 },
      { type: 'plant', lx: 5, ly: 3 },
    ],
    workTiles: [[2, 2], [5, 2]],
  },
  finance: {
    name: 'Finance Office', icon: '🏦', accent: '#50a070',
    accentRGB: [80,160,112], floorBase: [52,64,58], wallBase: [68,84,74], floorPattern: 'tile',
    size: { w: 7, h: 4 }, cost: 1500,
    furniture: [
      { type: 'desk', lx: 1, ly: 1 },
      { type: 'monitor', lx: 2, ly: 1, screens: 2 },
      { type: 'chair', lx: 1, ly: 2 },
      { type: 'monitor', lx: 4, ly: 1, screens: 2 },
      { type: 'desk', lx: 4, ly: 1 },
      { type: 'server', lx: 0, ly: 0 },
    ],
    workTiles: [[2, 2], [5, 2]],
  },
  legal: {
    name: 'Legal Dept', icon: '⚖️', accent: '#a08860',
    accentRGB: [160,136,96], floorBase: [64,58,50], wallBase: [84,76,66], floorPattern: 'tile',
    size: { w: 7, h: 4 }, cost: 2500,
    furniture: [
      { type: 'desk', lx: 1, ly: 1 },
      { type: 'bookshelf', lx: 0, ly: 0 },
      { type: 'bookshelf', lx: 0, ly: 2 },
      { type: 'shelf', lx: 5, ly: 0 },
      { type: 'chair', lx: 1, ly: 2 },
    ],
    workTiles: [[2, 2], [5, 2]],
  },
  it: {
    name: 'Server Room', icon: '🖥️', accent: '#6090b0',
    accentRGB: [96,144,176], floorBase: [50,56,64], wallBase: [66,74,84], floorPattern: 'lab',
    size: { w: 7, h: 4 }, cost: 3000,
    furniture: [
      { type: 'server', lx: 0, ly: 0 },
      { type: 'server', lx: 0, ly: 1 },
      { type: 'server', lx: 0, ly: 2 },
      { type: 'monitor', lx: 3, ly: 1, screens: 1 },
      { type: 'desk', lx: 3, ly: 1 },
    ],
    workTiles: [[4, 2], [2, 2]],
  },
  rd: {
    name: 'R&D Lab', icon: '🔬', accent: '#a060c0',
    accentRGB: [160,96,192], floorBase: [62,52,68], wallBase: [82,68,90], floorPattern: 'lab',
    size: { w: 7, h: 5 }, cost: 4000,
    furniture: [
      { type: 'desk', lx: 1, ly: 1 },
      { type: 'monitor', lx: 2, ly: 1, screens: 2 },
      { type: 'chair', lx: 1, ly: 2 },
      { type: 'desk', lx: 4, ly: 2 },
      { type: 'monitor', lx: 4, ly: 1, screens: 2 },
      { type: 'whiteboard', lx: 5, ly: 0 },
      { type: 'server', lx: 0, ly: 0 },
    ],
    workTiles: [[2, 2], [5, 3], [3, 3]],
  },
  warehouse: {
    name: 'Warehouse', icon: '📦', accent: '#8a7a60',
    accentRGB: [138,122,96], floorBase: [62,58,50], wallBase: [82,76,66], floorPattern: 'concrete',
    size: { w: 7, h: 4 }, cost: 1000,
    furniture: [
      { type: 'crate', lx: 0, ly: 0 },
      { type: 'crate', lx: 0, ly: 1 },
      { type: 'crate', lx: 1, ly: 0 },
      { type: 'crate', lx: 1, ly: 1 },
      { type: 'shelf', lx: 4, ly: 0 },
      { type: 'shelf', lx: 5, ly: 0 },
    ],
    workTiles: [[3, 2], [5, 2]],
  },
};

export const COMMON_ROOMS = {
  breakroom: {
    name: 'Break Room', icon: '☕', accent: '#c09050',
    accentRGB: [192,144,80], floorBase: [68,60,52], wallBase: [88,78,68], floorPattern: 'wood',
    size: { w: 7, h: 4 }, cost: 800,
    furniture: [
      { type: 'coffeemachine', lx: 0, ly: 0, interactive: true, configKey: 'coffee_quality', label: 'Coffee Quality' },
      { type: 'table', lx: 2, ly: 1 },
      { type: 'chair', lx: 2, ly: 2 },
      { type: 'chair', lx: 3, ly: 2 },
      { type: 'couch', lx: 4, ly: 0, interactive: true, configKey: 'break_duration', label: 'Break Policy' },
      { type: 'plant', lx: 5, ly: 3 },
      { type: 'plant', lx: 6, ly: 1, interactive: true, configKey: 'perks_package', label: 'Perks Package' },
    ],
    workTiles: [[3, 2], [1, 1], [5, 2]],
  },
  meeting: {
    name: 'Meeting Room', icon: '🤝', accent: '#8080a0',
    accentRGB: [128,128,160], floorBase: [58,58,66], wallBase: [78,78,90], floorPattern: 'carpet',
    size: { w: 7, h: 4 }, cost: 1000,
    furniture: [
      { type: 'bigtv', lx: 3, ly: 0, interactive: true, configKey: 'meeting_schedule', label: 'Meeting Frequency' },
      { type: 'table', lx: 2, ly: 2 },
      { type: 'chair', lx: 1, ly: 2 },
      { type: 'chair', lx: 3, ly: 3 },
      { type: 'chair', lx: 4, ly: 2 },
      { type: 'whiteboard', lx: 0, ly: 0, interactive: true, configKey: 'meeting_focus', label: 'Meeting Focus' },
      { type: 'plant', lx: 5, ly: 0 },
    ],
    workTiles: [[2, 3], [4, 3], [3, 2]],
  },
  lobby: {
    name: 'Lobby', icon: '🏢', accent: '#a08060',
    accentRGB: [160,128,96], floorBase: [60,54,48], wallBase: [80,72,64], floorPattern: 'tile',
    size: { w: 5, h: 3 }, cost: 0,
    furniture: [
      { type: 'couch', lx: 1, ly: 0, interactive: true, configKey: 'lobby_style', label: 'Lobby Style' },
      { type: 'plant', lx: 4, ly: 0 },
      { type: 'plant', lx: 0, ly: 2, interactive: true, configKey: 'workspace_quality', label: 'Workspace Quality' },
    ],
    workTiles: [[2, 1], [3, 1]],
  },
};

// ─── Agent roles ───────────────────────────────────────────
export const AGENT_ROLES = {
  ceo:            { title: 'CEO (You)',        office: 'any',         color: '#f0c040', emoji: '👔', accessory: 'glasses' },
  seo_analyst:    { title: 'SEO Analyst',      office: 'seo',         color: '#50b868', emoji: '🔍', accessory: 'glasses' },
  content_writer: { title: 'Content Writer',   office: 'content',     color: '#9068d0', emoji: '✍️', accessory: 'pen' },
  video_creator:  { title: 'Video Creator',    office: 'video',       color: '#e07030', emoji: '🎬', accessory: 'cap' },
  designer:       { title: 'Designer',         office: 'design',      color: '#d058a0', emoji: '🎨', accessory: 'beret' },
  data_analyst:   { title: 'Data Analyst',     office: 'data',        color: '#4090e0', emoji: '📊', accessory: 'headphones' },
  support_agent:  { title: 'Support Agent',    office: 'support',     color: '#40b0b0', emoji: '🎧', accessory: 'headset' },
  sales_rep:      { title: 'Sales Rep',        office: 'sales',       color: '#e0a030', emoji: '💼', accessory: 'glasses' },
  engineer:       { title: 'Engineer',         office: 'engineering', color: '#5090c0', emoji: '⚙️', accessory: 'glasses' },
  craftsman:      { title: 'Craftsman',        office: 'workshop',    color: '#8b6c42', emoji: '🔧', accessory: 'cap' },
  marketer:       { title: 'Marketer',         office: 'marketing',   color: '#c05080', emoji: '📣', accessory: 'glasses' },
  pr_specialist:  { title: 'PR Specialist',    office: 'pr',          color: '#70a050', emoji: '📰', accessory: 'pen' },
  hr_manager:     { title: 'HR Manager',       office: 'hr',          color: '#9080c0', emoji: '👥', accessory: 'glasses' },
  accountant:     { title: 'Accountant',       office: 'finance',     color: '#50a070', emoji: '🏦', accessory: 'glasses' },
  lawyer:         { title: 'Lawyer',           office: 'legal',       color: '#a08860', emoji: '⚖️', accessory: 'glasses' },
  it_admin:       { title: 'IT Admin',         office: 'it',          color: '#6090b0', emoji: '🖥️', accessory: 'headphones' },
  researcher:     { title: 'Researcher',       office: 'rd',          color: '#a060c0', emoji: '🔬', accessory: 'glasses' },
  warehouse_mgr:  { title: 'Warehouse Mgr',   office: 'warehouse',   color: '#8a7a60', emoji: '📦', accessory: 'cap' },
};

// ─── Office guide (business identity, money drivers) ───────
export const OFFICE_GUIDE = {
  seo: {
    role: 'Traffic Driver', impact: 'Raises organic visitors and reputation.',
    guide: 'Your SEO team analyzes keywords, audits websites, and optimizes search rankings. They bring in organic traffic — visitors who find you through Google instead of paid ads.',
    howItWorks: 'Agents research keywords, optimize content, and build backlinks. Each completed SEO project boosts your organic traffic multiplier.',
    tips: 'Pair with Content Studio for a 15% synergy bonus. More organic traffic = more leads without spending on marketing.',
    projects: 'SEO Audit, Keyword Research',
  },
  content: {
    role: 'Demand Driver', impact: 'Boosts traffic and lead quality.',
    guide: 'Content writers produce blog posts, social campaigns, and thought leadership. Great content attracts visitors and warms up leads before they reach sales.',
    howItWorks: 'Writers research topics, draft articles, and edit for quality. Finished content increases both traffic and lead conversion rate.',
    tips: 'Content synergizes with multiple offices — SEO (+15%), Video (+10%), Marketing (+15%), and PR (+10%). A content team is one of the best early investments.',
    projects: 'Blog Post, Social Campaign',
  },
  design: {
    role: 'Conversion Driver', impact: 'Improves website conversion rate.',
    guide: 'Designers create brand visuals, landing pages, and UI mockups. Good design makes your company look professional and convinces more visitors to become customers.',
    howItWorks: 'Designers work on concepts, refine layouts, and polish deliverables. Each project improves your website conversion rate.',
    tips: 'Design synergizes with Sales (+15% from polished decks), Engineering (+10% from UI/UX), and Workshop (+15% from design specs).',
    projects: 'Brand Redesign, Landing Page',
  },
  sales: {
    role: 'Revenue Driver', impact: 'Improves lead close rate.',
    guide: 'Sales reps turn leads into paying clients. They review prospects, draft proposals, and close deals. Without sales, your leads just sit there unconverted.',
    howItWorks: 'Agents follow up on leads, negotiate contracts, and close deals. Your close rate improves as the team gains experience.',
    tips: 'Build Design Studio first for a 15% synergy from polished sales decks. Sales is essential once you have steady lead flow.',
    projects: 'Sales Deck',
  },
  video: {
    role: 'Premium Delivery', impact: 'Unlocks higher-ticket client projects.',
    guide: 'The video team shoots promos, product demos, and brand films. Video projects pay significantly more than other work — this is your premium service line.',
    howItWorks: 'Crew scripts, films, and edits video. Projects take longer but pay 2-3x more. Requires cameras, green screens, and lighting.',
    tips: 'Content Studio synergy (+10%) improves script quality. Video is expensive to build but has the highest project payouts.',
    projects: 'Promo Video, Product Demo',
  },
  support: {
    role: 'Retention Engine', impact: 'Stabilizes operations and reliable income.',
    guide: 'Support agents handle client tickets, resolve issues, and maintain satisfaction. Happy clients mean steady recurring revenue and referrals.',
    howItWorks: 'Agents triage incoming tickets, resolve problems, and follow up. Improves client retention and stabilizes your income stream.',
    tips: 'An early support team prevents client churn. Low cost, consistent value. Diversify into client-facing CS outsourcing for extra revenue.',
    projects: 'Ticket Backlog',
  },
  data: {
    role: 'Insight Unlock', impact: 'Unlocks deeper metrics and optimization.',
    guide: 'Data analysts crunch numbers, build dashboards, and find optimization opportunities. They help every other department work smarter with data-driven decisions.',
    howItWorks: 'Analysts query databases, build visualizations, and deliver insights. Improves efficiency across all offices.',
    tips: 'Synergizes with SEO (+10%) and Engineering (+10%). Data Lab is expensive but pays off by making your whole operation more efficient.',
    projects: 'Analytics Report, Data Dashboard',
  },
  engineering: {
    role: 'Product Builder', impact: 'Develops software & technical solutions.',
    guide: 'Engineers build apps, APIs, and technical solutions. If you\'re running a SaaS or tech company, this is your core delivery team.',
    howItWorks: 'Engineers architect, code, and test software. Projects are complex and high-paying. They need design specs and data pipelines to be most effective.',
    tips: 'Design (+10% UI/UX) and Data (+10% pipeline) synergies make engineering much more productive. Highest salaries but highest project payouts.',
    projects: 'App Development, API Integration',
  },
  workshop: {
    role: 'Maker Space', impact: 'Builds physical products and prototypes.',
    guide: 'Craftsmen build physical products — prototypes, custom builds, and manufactured goods. Essential for e-commerce and maker companies.',
    howItWorks: 'Craftsmen measure, fabricate, and assemble products. Projects require workspace and tools. Output fills your warehouse for shipping.',
    tips: 'Design (+15% from specs) and Engineering (+10% from CAD models) make workshop projects faster and higher quality.',
    projects: 'Product Prototype, Custom Build',
  },
  marketing: {
    role: 'Growth Engine', impact: 'Reduces CPC 25%, boosts marketing ROI.',
    guide: 'Marketers plan campaigns, run A/B tests, and optimize your ad spend. They make every marketing dollar go further by reducing your cost-per-click.',
    howItWorks: 'Team plans campaigns, tests ad creatives, and analyzes ROI. Reduces CPC by 25% and improves your marketing budget efficiency.',
    tips: 'Content (+15%) and Design (+10%) synergies improve campaign assets. Build this once you\'re spending on the marketing budget slider.',
    projects: 'Ad Campaign',
  },
  pr: {
    role: 'Brand Builder', impact: 'Increases reputation gain and organic traffic.',
    guide: 'PR specialists pitch stories to media, write press releases, and build your brand reputation. Good PR brings organic traffic and makes hiring easier.',
    howItWorks: 'PR team drafts releases, pitches to journalists, and lands media features. Each successful project boosts your reputation multiplier.',
    tips: 'Content synergy (+10%) helps craft better story angles. PR is great for mid-game when you need reputation growth.',
    projects: 'Press Release, Media Feature',
  },
  hr: {
    role: 'Talent Ops', impact: '-30% signing cost, better candidates + hiring projects.',
    guide: 'HR manages your hiring pipeline. Without HR, you\'re limited to founder hiring (first 3 people). With HR, you get ongoing candidate pools and reduced signing costs.',
    howItWorks: 'HR Manager produces candidate pools each hiring round. Candidates have varying skills, efficiency, and salary demands. 30% discount on signing costs.',
    tips: 'Build HR early to unlock unlimited recruiting. HR also runs Training and Hiring Round projects that improve your team over time.',
    projects: 'Hiring Round, Team Training',
  },
  finance: {
    role: 'Cost Control', impact: 'Lower loan interest, budget forecasting + audits.',
    guide: 'Accountants manage your books, forecast budgets, and negotiate better loan terms. They keep your finances healthy and prevent cash flow surprises.',
    howItWorks: 'Finance team runs audits, builds forecasts, and manages payroll. Reduces loan interest rates and provides financial visibility.',
    tips: 'Essential before taking loans — lower interest saves thousands. Finance projects like Due Diligence pay well when diversified.',
    projects: 'Quarterly Audit, Budget Forecast',
  },
  legal: {
    role: 'Contract Boost', impact: '+15% project pay on all completions + legal work.',
    guide: 'Lawyers review contracts, handle compliance, and file IP. They negotiate better terms on every project your company completes — a flat 15% pay boost.',
    howItWorks: 'Legal reviews every contract, squeezing 15% more revenue from each project completion. Also handles compliance and IP filing.',
    tips: 'One of the best ROI offices. The 15% bonus applies to ALL projects, so it pays for itself quickly as your project volume grows.',
    projects: 'Contract Review, Compliance Check',
  },
  it: {
    role: 'Tech Backbone', impact: '+8% global agent efficiency + server ops.',
    guide: 'IT admins maintain servers, patch security, and keep systems running. They provide a global +8% efficiency boost to every agent in every office.',
    howItWorks: 'IT maintains infrastructure. The efficiency bonus means all your agents work 8% faster — this compounds across your entire workforce.',
    tips: 'More valuable the bigger your team gets. +8% on 20 agents is far more impactful than +8% on 3. Build IT once you have 10+ staff.',
    projects: 'Server Migration, Security Audit',
  },
  rd: {
    role: 'Innovation Lab', impact: 'Periodic breakthroughs boost project pay + R&D work.',
    guide: 'Researchers run experiments and discover breakthroughs. Each breakthrough provides a temporary bonus to project payouts across your company.',
    howItWorks: 'R&D runs experiments and innovation sprints. Periodically discovers breakthroughs that boost all project payouts for a limited time.',
    tips: 'R&D is a late-game investment — expensive staff and slow payoff, but breakthroughs can be very lucrative at scale.',
    projects: 'R&D Experiment, Innovation Sprint',
  },
  warehouse: {
    role: 'Logistics Hub', impact: '+20% project capacity, fulfillment + inventory.',
    guide: 'Warehouse handles storage, fulfillment, and shipping. It increases how many projects your company can handle simultaneously by 20%.',
    howItWorks: 'Warehouse managers run inventory audits and fulfillment runs. The +20% capacity means you can take on more client projects at once.',
    tips: 'Critical for e-commerce and maker companies. Build this when you\'re maxing out on simultaneous projects.',
    projects: 'Inventory Audit, Fulfillment Run',
  },
  breakroom: {
    role: 'Morale', impact: 'Restores mood and long-term productivity.',
    guide: 'A place for agents to rest and recharge. Tired agents lose efficiency — the breakroom lets them recover energy quickly instead of slowly idling.',
    howItWorks: 'Exhausted agents automatically visit the breakroom to recover energy. Recovery rate is 16x faster than passive idle recovery.',
    tips: 'Build this early! Without a breakroom, exhausted agents barely recover. One breakroom serves your whole team.',
    projects: 'None — passive facility',
  },
  meeting: {
    role: 'Coordination', impact: 'Enables collaboration and close-rate boost.',
    guide: 'Meeting rooms let agents from different departments collaborate. Cross-team synergies happen here, boosting project quality and sales close rate.',
    howItWorks: 'Agents periodically meet to share knowledge. Improves collaboration bonuses and gives a close-rate boost to your sales pipeline.',
    tips: 'Cheap to build and maintain. The collaboration boost helps all departments work better together.',
    projects: 'None — passive facility',
  },
  lobby: {
    role: 'Foundation', impact: 'Starting area and team entry point.',
    guide: 'Your company lobby. This is where new hires arrive and where your CEO works. Every company starts with a lobby — it\'s the heart of your operation.',
    howItWorks: 'New agents spawn in the lobby before walking to their assigned office. Your CEO hangs out here reviewing strategy.',
    tips: 'You can\'t remove the lobby. It comes free with your starting floor plan.',
    projects: 'None — starting facility',
  },
};

// ─── P&L Office categories (static fallback) ────────────
export const OFFICE_CATEGORIES = {
  delivery:   { label: 'Delivery',   icon: '⚡', offices: ['seo','content','video','design','data','engineering','workshop'] },
  growth:     { label: 'Growth',     icon: '📈', offices: ['sales','marketing','pr'] },
  operations: { label: 'Operations', icon: '🏗️', offices: ['support','hr','finance','legal','it','rd','warehouse'] },
  common:     { label: 'Common',     icon: '🏠', offices: ['lobby','breakroom','meeting'] },
};

// ─── Per-company-type office role mappings ────────────────
// Each company type maps offices into delivery / growth / infrastructure roles.
// "delivery" offices are the core revenue generators — they get the most projects.
// "growth" offices drive pipeline. "infrastructure" offices provide passive bonuses.
export const COMPANY_OFFICE_ROLES = {
  digital_agency:   { delivery: ['seo','content','video','design'],              growth: ['sales','marketing','pr'],          infrastructure: ['support','hr','finance','legal','it','data','engineering','workshop','rd'] },
  saas_startup:     { delivery: ['engineering','design'],                        growth: ['sales','content','marketing'],      infrastructure: ['support','hr','finance','legal','it','data','rd'] },
  ecommerce:        { delivery: ['sales','warehouse'],                           growth: ['marketing','content','design','pr'],infrastructure: ['support','hr','finance','it','legal','data'] },
  creative_house:   { delivery: ['design','video','content'],                    growth: ['sales','pr','marketing'],           infrastructure: ['seo','support','hr','finance'] },
  tech_lab:         { delivery: ['engineering','data','rd'],                     growth: ['sales','marketing','design'],        infrastructure: ['support','hr','finance','legal','it'] },
  maker_co:         { delivery: ['workshop','engineering','warehouse'],          growth: ['sales','design'],                    infrastructure: ['support','hr','finance','legal','it','rd'] },
  consulting_firm:  { delivery: ['data','engineering','content'],               growth: ['sales','pr','marketing'],             infrastructure: ['support','hr','finance','legal','it'] },
  staffing_agency:  { delivery: ['hr','support'],                               growth: ['sales','marketing','pr'],             infrastructure: ['finance','legal','it','data','content'] },
};

// ─── Spawn weight per office role ────────────────────────
// Delivery offices get the most projects. Growth offices get some.
// Infrastructure offices get very few (internal work only).
export const OFFICE_ROLE_WEIGHTS = { delivery: 1.0, growth: 0.3, infrastructure: 0.15 };

// ─── Diversification config ──────────────────────────────
// Mid-game mechanic: flip infrastructure/growth offices to delivery role.
export const DIVERSIFICATION_CONFIG = {
  baseCost: 5000,
  premiumCost: 10000,                         // for engineering, rd, legal, finance, it
  premiumOffices: ['engineering','rd','legal','finance','it'],
  remodelingDays: 3,
  passiveBonusReduction: 0.5,                 // diversified offices lose half their passive bonus
};

// ─── Project templates ─────────────────────────────────────
export const PROJECT_TEMPLATES = [
  { name: 'SEO Audit',         icon: '🔍', basePay: 900,  office: 'seo',     phases: ['analyze','optimize','report'], time: 10, color: '#50b868' },
  { name: 'Blog Post',         icon: '✍️', basePay: 600,  office: 'content', phases: ['research','write','edit'], time: 8, color: '#9068d0' },
  { name: 'Promo Video',       icon: '🎬', basePay: 1800, office: 'video',   phases: ['script','film','edit'], time: 14, color: '#e07030' },
  { name: 'Brand Redesign',    icon: '🎨', basePay: 2200, office: 'design',  phases: ['concept','design','refine'], time: 16, color: '#d058a0' },
  { name: 'Analytics Report',  icon: '📊', basePay: 1200, office: 'data',    phases: ['query','analyze','visualize'], time: 12, color: '#4090e0' },
  { name: 'Ticket Backlog',    icon: '🎧', basePay: 700,  office: 'support', phases: ['triage','resolve','followup'], time: 7, color: '#40b0b0' },
  { name: 'Keyword Research',  icon: '🔑', basePay: 800,  office: 'seo',     phases: ['research','cluster','report'], time: 9, color: '#50b868' },
  { name: 'Social Campaign',   icon: '📱', basePay: 1000, office: 'content', phases: ['plan','create','schedule'], time: 10, color: '#9068d0' },
  { name: 'Landing Page',      icon: '🎨', basePay: 1500, office: 'design',  phases: ['wireframe','design','polish'], time: 12, color: '#d058a0' },
  { name: 'Data Dashboard',    icon: '📊', basePay: 1800, office: 'data',    phases: ['model','build','test'], time: 14, color: '#4090e0' },
  { name: 'Product Demo',      icon: '🎬', basePay: 2500, office: 'video',   phases: ['storyboard','shoot','post'], time: 16, color: '#e07030' },
  { name: 'Sales Deck',        icon: '💼', basePay: 1100, office: 'sales',   phases: ['research','draft','present'], time: 10, color: '#e0a030' },
  { name: 'App Development',   icon: '⚙️', basePay: 2800, office: 'engineering', phases: ['architect','code','test'], time: 18, color: '#5090c0' },
  { name: 'API Integration',   icon: '🔌', basePay: 1600, office: 'engineering', phases: ['design','implement','deploy'], time: 12, color: '#5090c0' },
  { name: 'Product Prototype', icon: '🔧', basePay: 1400, office: 'workshop',    phases: ['design','build','finish'], time: 14, color: '#8b6c42' },
  { name: 'Custom Build',      icon: '🛠️', basePay: 2000, office: 'workshop',    phases: ['measure','fabricate','assemble'], time: 16, color: '#8b6c42' },
  { name: 'Ad Campaign',       icon: '📣', basePay: 1200, office: 'marketing',   phases: ['research','create','launch'], time: 10, color: '#c05080' },
  { name: 'Press Release',     icon: '📰', basePay: 800,  office: 'pr',          phases: ['draft','pitch','publish'], time: 8,  color: '#70a050' },
  { name: 'Media Feature',     icon: '🌟', basePay: 1500, office: 'pr',          phases: ['research','interview','edit'], time: 12, color: '#70a050' },
  // Operations
  { name: 'Hiring Round',      icon: '👥', basePay: 500,  office: 'hr',          phases: ['screen','interview','offer'], time: 8,  color: '#d0a050' },
  { name: 'Team Training',     icon: '📋', basePay: 400,  office: 'hr',          phases: ['plan','prepare','deliver'], time: 6,  color: '#d0a050' },
  { name: 'Quarterly Audit',   icon: '🏦', basePay: 700,  office: 'finance',     phases: ['collect','reconcile','report'], time: 10, color: '#508060' },
  { name: 'Budget Forecast',   icon: '📈', basePay: 600,  office: 'finance',     phases: ['model','review','present'], time: 8,  color: '#508060' },
  { name: 'Contract Review',   icon: '⚖️', basePay: 900,  office: 'legal',       phases: ['review','redline','finalize'], time: 10, color: '#806090' },
  { name: 'Compliance Check',  icon: '📑', basePay: 700,  office: 'legal',       phases: ['audit','document','certify'], time: 8,  color: '#806090' },
  { name: 'Server Migration',  icon: '🖥️', basePay: 1000, office: 'it',          phases: ['plan','migrate','verify'], time: 12, color: '#4080a0' },
  { name: 'Security Audit',    icon: '🔒', basePay: 800,  office: 'it',          phases: ['scan','patch','harden'], time: 10, color: '#4080a0' },
  { name: 'R&D Experiment',    icon: '🔬', basePay: 1200, office: 'rd',          phases: ['hypothesize','test','analyze'], time: 14, color: '#7060b0' },
  { name: 'Innovation Sprint', icon: '💡', basePay: 1500, office: 'rd',          phases: ['ideate','prototype','validate'], time: 16, color: '#7060b0' },
  { name: 'Inventory Audit',   icon: '📦', basePay: 400,  office: 'warehouse',   phases: ['count','reconcile','update'], time: 6,  color: '#8b7355' },
  { name: 'Fulfillment Run',   icon: '🚚', basePay: 600,  office: 'warehouse',   phases: ['pick','pack','ship'], time: 8,  color: '#8b7355' },
  // Client-facing projects — only spawn when office is in delivery role (native or diversified)
  { name: 'Executive Search',  icon: '👤', basePay: 2200, office: 'hr',          phases: ['profile','source','place'], time: 14, color: '#9080c0', clientFacing: true },
  { name: 'Talent Placement',  icon: '🤝', basePay: 1800, office: 'hr',          phases: ['assess','match','onboard'], time: 12, color: '#9080c0', clientFacing: true },
  { name: 'Workforce Planning',icon: '📋', basePay: 1600, office: 'hr',          phases: ['audit','forecast','plan'], time: 10, color: '#9080c0', clientFacing: true },
  { name: 'Financial Modeling', icon: '📈', basePay: 2500, office: 'finance',     phases: ['model','stress-test','report'], time: 14, color: '#508060', clientFacing: true },
  { name: 'Due Diligence',     icon: '🔎', basePay: 2000, office: 'finance',     phases: ['collect','analyze','findings'], time: 12, color: '#508060', clientFacing: true },
  { name: 'IP Filing',         icon: '📄', basePay: 2800, office: 'legal',       phases: ['research','draft','file'], time: 16, color: '#806090', clientFacing: true },
  { name: 'M&A Advisory',      icon: '🏛️', basePay: 3500, office: 'legal',       phases: ['assess','negotiate','close'], time: 18, color: '#806090', clientFacing: true },
  { name: 'Cloud Migration',   icon: '☁️', basePay: 2400, office: 'it',          phases: ['assess','migrate','validate'], time: 14, color: '#4080a0', clientFacing: true },
  { name: 'SOC 2 Audit',       icon: '🛡️', basePay: 2000, office: 'it',          phases: ['scope','test','certify'], time: 12, color: '#4080a0', clientFacing: true },
  { name: 'CS Outsource',      icon: '📞', basePay: 1400, office: 'support',     phases: ['setup','train','operate'], time: 10, color: '#40b0b0', clientFacing: true },
  { name: 'Help Desk Setup',   icon: '🖥️', basePay: 1200, office: 'support',     phases: ['design','configure','launch'], time: 8,  color: '#40b0b0', clientFacing: true },
  { name: 'GTM Strategy',      icon: '🚀', basePay: 2000, office: 'marketing',   phases: ['research','plan','playbook'], time: 12, color: '#c05080', clientFacing: true },
  { name: 'Brand Audit',       icon: '🔍', basePay: 1600, office: 'marketing',   phases: ['assess','benchmark','report'], time: 10, color: '#c05080', clientFacing: true },
  { name: 'ML Pipeline',       icon: '🤖', basePay: 3000, office: 'data',        phases: ['ingest','train','deploy'], time: 16, color: '#4090e0', clientFacing: true },
  { name: 'Data Strategy',     icon: '📊', basePay: 1800, office: 'data',        phases: ['audit','roadmap','present'], time: 12, color: '#4090e0', clientFacing: true },
  { name: 'Tech Due Diligence',icon: '🧪', basePay: 2600, office: 'rd',          phases: ['assess','test','report'], time: 14, color: '#7060b0', clientFacing: true },
  { name: 'Patent Research',   icon: '📜', basePay: 2200, office: 'rd',          phases: ['search','analyze','brief'], time: 12, color: '#7060b0', clientFacing: true },
];

// ─── Speech lines ──────────────────────────────────────────
export const SPEECH_WORKING = {
  ceo:         ['Reviewing strategy...', 'Checking financials...', 'Making decisions...', 'Planning ahead...', 'On a call...', 'Reading reports...'],
  seo:         ['Analyzing backlinks...', 'Checking rankings...', 'Optimizing meta tags...', 'Running site audit...'],
  content:     ['Drafting intro...', 'Researching topic...', 'Editing paragraph...', 'Adding sources...'],
  video:       ['Setting up shot...', 'Adjusting lighting...', 'Recording take 3...', 'Color grading...'],
  design:      ['Tweaking colors...', 'Aligning elements...', 'Creating mockup...', 'Vectorizing logo...'],
  data:        ['Running query...', 'Building chart...', 'Crunching numbers...', 'Joining tables...'],
  support:     ['Reading ticket...', 'Drafting response...', 'Escalating issue...', 'Closing ticket...'],
  sales:       ['Reviewing leads...', 'Drafting proposal...', 'Following up...', 'Closing deal...', '💰 Deal signed!', 'Client onboarded!', 'Negotiating terms...'],
  engineering: ['Writing tests...', 'Debugging code...', 'Deploying build...', 'Code review...', 'Refactoring...', 'Merging PR...'],
  workshop:    ['Measuring parts...', 'Cutting material...', 'Assembling pieces...', 'Sanding finish...', 'Quality check...'],
  marketing:   ['Planning campaign...', 'A/B testing ads...', 'Analyzing ROI...', 'Launching promo...', 'Optimizing funnel...'],
  pr:          ['Pitching story...', 'Writing release...', 'Media outreach...', 'Scheduling interview...', 'Editing quotes...'],
  hr:          ['Screening resumes...', 'Scheduling interview...', 'Writing job ad...', 'Reviewing applications...', 'Shortlisting candidates...', 'Checking references...', 'Onboarding new hire...'],
  finance:     ['Reconciling books...', 'Running payroll...', 'Budget forecast...', 'Tax planning...'],
  legal:       ['Reviewing contract...', 'Filing paperwork...', 'Compliance check...', 'Drafting NDA...'],
  it:          ['Updating servers...', 'Patching security...', 'Monitoring uptime...', 'Backup running...'],
  rd:          ['Running experiment...', 'Analyzing data...', 'Testing hypothesis...', 'Writing paper...'],
  warehouse:   ['Checking inventory...', 'Packing orders...', 'Receiving shipment...', 'Organizing stock...'],
};
export const SPEECH_THINKING = ['Hmm...', 'Let me think...', 'Processing...', 'Analyzing...', 'One moment...', '🤔'];
export const SPEECH_IDLE = ['☕ Coffee time!', 'Ready to go!', 'What\'s next?', '💤 Quiet day...', 'Stretching...'];
export const SPEECH_DONE = ['✅ Done!', 'Shipped it!', 'Task complete!', '🎉 Finished!'];
export const SPEECH_BREAK = ['Ahh, needed this!', 'Good coffee ☕', 'Recharging...', 'Back in 5!'];
export const SPEECH_EXHAUSTED = ['So tired...', 'Need a break...', 'Running on empty...', 'Can barely focus...', 'Must rest...'];
export const SPEECH_COLLAB = ['Great meeting!', 'Good sync!', 'Love this team!', 'Learned something!'];
export const SPEECH_RAISE = ['I need a raise...', 'I\'m underpaid for my skills', 'Can we talk compensation?', 'I deserve better pay'];
export const SPEECH_QUIT = ['I quit! Not valued here.', 'Time to move on.', 'Found a better offer.', 'Good luck without me!'];
export const SPEECH_SKILL_CAP = ['I\'ve peaked...', 'Need new challenges', 'Hit my ceiling here', 'Not growing anymore'];

// ─── IQ Labels ──────────────────────────────────────────
export const IQ_LABELS = [
  { min: 0,    max: 0.7,  label: 'Slow',      emoji: '🧠' },
  { min: 0.7,  max: 1.0,  label: 'Average',   emoji: '🧠' },
  { min: 1.0,  max: 1.3,  label: 'Sharp',     emoji: '🧠' },
  { min: 1.3,  max: 2.0,  label: 'Brilliant',  emoji: '🧠' },
];

export function getIQLabel(iq) {
  const tier = IQ_LABELS.find(t => iq >= t.min && iq < t.max) || IQ_LABELS[IQ_LABELS.length - 1];
  return tier;
}

// ─── Energy drain coefficients per role (per ms while working) ───
// Higher = drains faster. Intense roles burn energy quicker.
export const ENERGY_DRAIN = {
  ceo:            0.00012,
  seo_analyst:    0.00010,
  content_writer: 0.00009,
  video_creator:  0.00014,
  designer:       0.00011,
  data_analyst:   0.00013,
  support_agent:  0.00008,
  sales_rep:      0.00011,
  engineer:       0.00015,
  craftsman:      0.00013,
  marketer:       0.00010,
  pr_specialist:  0.00009,
  hr_manager:     0.00007,
  accountant:     0.00008,
  lawyer:         0.00010,
  it_admin:       0.00012,
  researcher:     0.00014,
  warehouse_mgr:  0.00009,
};

// Energy recovery rate per ms during break (in break room)
export const ENERGY_RECOVERY_RATE = 0.0008;
// Passive recovery rate when idle (no break room) — very slow
export const ENERGY_PASSIVE_RECOVERY = 0.00005;
// Energy threshold below which agent is forced to break
export const ENERGY_EXHAUSTION_THRESHOLD = 0.12;
// Energy threshold below which efficiency starts dropping
export const ENERGY_LOW_THRESHOLD = 0.35;

export const CHARACTER_NAMES = [
  'Alex','Sam','Jordan','Riley','Casey','Morgan','Quinn','Avery','Blake','Drew',
  'Sage','Reese','Kai','River','Rowan','Harper','Ellis','Finley','Dakota','Emery',
];

// ─── TeamDay character avatars per role ──────────────────
export const TEAMDAY_CHARACTERS = {
  ceo:            [],
  seo_analyst:    [{ name: 'Sarah', image: 'assets/team/sarah-seo.webp' }, { name: 'Nina', image: 'assets/team/nina-research.webp' }],
  content_writer: [{ name: 'Maya', image: 'assets/team/maya-content.webp' }, { name: 'Sage', image: 'assets/team/sage-content-strategist.webp' }, { name: 'Casey', image: 'assets/team/casey-technical-writer.webp' }],
  video_creator:  [{ name: 'Reel', image: 'assets/team/reel-video-creator.webp' }, { name: 'Vince', image: 'assets/team/vince-video-producer.webp' }, { name: 'Story', image: 'assets/team/story-scriptwriter.webp' }],
  designer:       [{ name: 'Pixel', image: 'assets/team/pixel-image-creator.webp' }, { name: 'Morgan', image: 'assets/team/morgan-cmo.webp' }],
  data_analyst:   [{ name: 'James', image: 'assets/team/james-data.webp' }, { name: 'Parker', image: 'assets/team/parker-business-analyst.webp' }],
  support_agent:  [{ name: 'Echo', image: 'assets/team/social-media.webp' }, { name: 'Robin', image: 'assets/team/roleplay-coach.webp' }],
  sales_rep:      [{ name: 'Blake', image: 'assets/team/sales-agent.webp' }, { name: 'Riley', image: 'assets/team/riley-bdr.webp' }],
  engineer:       [{ name: 'Alex', image: 'assets/team/alex-engineer.webp' }, { name: 'Lena', image: 'assets/team/lena-devops.webp' }],
  craftsman:      [{ name: 'Dev', image: 'assets/team/wordpress-manager.webp' }, { name: 'Max', image: 'assets/team/gaming-ua.webp' }],
  marketer:       [{ name: 'Mara', image: 'assets/team/mara-email-marketer.webp' }, { name: 'Dana', image: 'assets/team/morgan-chief-of-staff.webp' }],
  pr_specialist:  [{ name: 'Claire', image: 'assets/team/competitive-intel.webp' }, { name: 'Sage', image: 'assets/team/sage-content-strategist.webp' }],
  hr_manager:     [{ name: 'Jordan', image: 'assets/team/jordan-hr-assistant.webp' }, { name: 'Ava', image: 'assets/team/interview-coach.webp' }],
  accountant:     [{ name: 'Parker', image: 'assets/team/parker-business-analyst.webp' }, { name: 'Leo', image: 'assets/team/gaming-ua.webp' }],
  lawyer:         [{ name: 'Quinn', image: 'assets/team/competitive-intel.webp' }, { name: 'Dana', image: 'assets/team/morgan-chief-of-staff.webp' }],
  it_admin:       [{ name: 'Lena', image: 'assets/team/lena-devops.webp' }, { name: 'Alex', image: 'assets/team/alex-engineer.webp' }],
  researcher:     [{ name: 'Nina', image: 'assets/team/nina-research.webp' }, { name: 'Iris', image: 'assets/team/roleplay-coach.webp' }],
  warehouse_mgr:  [{ name: 'Owen', image: 'assets/team/wordpress-manager.webp' }, { name: 'Kai', image: 'assets/team/gaming-ua.webp' }],
};

// ─── Analytics visibility levels ───────────────────────────
export const ANALYTICS_LEVELS = {
  0: { name: 'No Data',       description: 'You have no visibility into your business metrics.' },
  1: { name: 'Basic',         description: 'Rough numbers from your data lab.' },
  2: { name: 'Standard',      description: 'Your data analyst provides exact metrics.' },
  3: { name: 'Full Insight',  description: 'Full funnel analysis with projections.' },
};

// ─── Tutorial hints ────────────────────────────────────────
export const TUTORIAL_HINTS = [
  { trigger: 'start',      text: 'Welcome! Click the Build button to start placing rooms.' },
  { trigger: 'first_room', text: 'Great! Now hire an agent to work in your new office.' },
  { trigger: 'first_hire', text: 'Your agent needs projects! Build a Marketing HQ for paid traffic or Sales Office to close deals.' },
  { trigger: 'first_project', text: 'Projects are coming in! Watch your agents work and manage your cash flow.' },
  { trigger: 'low_mood',   text: 'Your agents look tired. Build a Break Room to let them recharge!' },
  { trigger: 'low_energy', text: 'An agent is running low on energy! They\'ll be forced to rest soon. Build a Break Room for faster recovery.' },
  { trigger: 'low_motivation', text: 'An agent\'s motivation is dropping! Set up Perks (Break Room) or give a raise to keep them happy.' },
  { trigger: 'stalled',    text: 'Projects are stalling! Hire more agents for the right departments.' },
  { trigger: 'low_alignment', text: 'Team alignment is low! Click on the CEO and run Team Building in the Meeting Room to get everyone on the same page.' },
  { trigger: 'analytics',  text: 'Build a Data Lab and hire an analyst to see your business metrics!' },
];

// ─── Equipment configuration options ─────────────────────
export const EQUIPMENT_CONFIGS = {
  sales_pricing: {
    label: 'Pricing Strategy', icon: '💰',
    options: [
      { key: 'budget',   label: 'Budget',   desc: 'Lower prices, faster close (pay ×0.7, close +30%)' },
      { key: 'standard', label: 'Standard', desc: 'Balanced pricing' },
      { key: 'premium',  label: 'Premium',  desc: 'Higher prices, slower close (pay ×1.3, close −30%)' },
    ],
    default: 'standard',
  },
  sales_followup: {
    label: 'Follow-up Intensity', icon: '📞',
    options: [
      { key: 'relaxed',    label: 'Relaxed',    desc: 'Low pressure (close ×0.8)' },
      { key: 'balanced',   label: 'Balanced',   desc: 'Normal follow-up' },
      { key: 'aggressive', label: 'Aggressive', desc: 'High pressure (close ×1.3, costs mood)' },
    ],
    default: 'balanced',
  },
  seo_focus: {
    label: 'SEO Focus', icon: '🎯',
    options: [
      { key: 'technical', label: 'Technical', desc: 'Technical SEO (+30% SEO quality)' },
      { key: 'content',   label: 'Content',   desc: 'Content SEO (+10% SEO, +20% organic)' },
      { key: 'backlinks', label: 'Backlinks', desc: 'Link building (+20% reputation gain)' },
    ],
    default: 'content',
  },
  seo_keywords: {
    label: 'Keyword Strategy', icon: '🔑',
    options: [
      { key: 'broad', label: 'Broad',  desc: 'Wide reach (+20% organic, −10% CR)' },
      { key: 'niche', label: 'Niche',  desc: 'Targeted (−20% organic, +30% CR)' },
      { key: 'local', label: 'Local',  desc: 'Local focus (steady traffic, +10% CR)' },
    ],
    default: 'broad',
  },
  content_research: {
    label: 'Research Depth', icon: '📚',
    options: [
      { key: 'quick',    label: 'Quick',    desc: 'Fast but lower quality (speed +30%, quality −20%)' },
      { key: 'thorough', label: 'Thorough', desc: 'Balanced approach' },
      { key: 'deep',     label: 'Deep',     desc: 'Slow but high quality (speed −30%, quality +30%)' },
    ],
    default: 'thorough',
  },
  content_style: {
    label: 'Content Style', icon: '✏️',
    options: [
      { key: 'shortform', label: 'Short-form', desc: 'Quick articles (speed +20%, quality −10%)' },
      { key: 'longform',  label: 'Long-form',  desc: 'In-depth pieces (speed −20%, quality +20%)' },
      { key: 'viral',     label: 'Viral',       desc: 'Shareable content (+30% organic, quality −10%)' },
    ],
    default: 'longform',
  },
  video_quality: {
    label: 'Production Quality', icon: '🎥',
    options: [
      { key: 'quick',     label: 'Quick',     desc: 'Fast production (speed +40%, quality −30%)' },
      { key: 'standard',  label: 'Standard',  desc: 'Normal production' },
      { key: 'cinematic', label: 'Cinematic', desc: 'Premium (speed −40%, quality +40%)' },
    ],
    default: 'standard',
  },
  video_effects: {
    label: 'Visual Effects', icon: '✨',
    options: [
      { key: 'basic',    label: 'Basic',    desc: 'Simple editing' },
      { key: 'advanced', label: 'Advanced', desc: 'Complex effects (+20% quality)' },
    ],
    default: 'basic',
  },
  design_style: {
    label: 'Design Style', icon: '🎨',
    options: [
      { key: 'minimalist', label: 'Minimalist', desc: 'Clean and simple (+10% CR)' },
      { key: 'bold',       label: 'Bold',       desc: 'Eye-catching (+10% quality, +15% CR)' },
      { key: 'playful',    label: 'Playful',    desc: 'Fun and creative (+10% organic)' },
    ],
    default: 'bold',
  },
  design_palette: {
    label: 'Color Palette', icon: '🎨',
    options: [
      { key: 'warm',    label: 'Warm',    desc: 'Warm tones (+5% CR)' },
      { key: 'cool',    label: 'Cool',    desc: 'Cool tones (+5% CR)' },
      { key: 'vibrant', label: 'Vibrant', desc: 'Vibrant colors (+8% CR)' },
    ],
    default: 'warm',
  },
  support_sla: {
    label: 'SLA Target', icon: '⏱️',
    options: [
      { key: 'fast',     label: 'Fast',     desc: 'Quick responses (speed +30%, quality −20%)' },
      { key: 'standard', label: 'Standard', desc: 'Normal support' },
      { key: 'thorough', label: 'Thorough', desc: 'Deep investigation (speed −30%, quality +30%)' },
    ],
    default: 'standard',
  },
  support_templates: {
    label: 'Response Templates', icon: '📋',
    options: [
      { key: 'basic',  label: 'Basic',  desc: 'Generic responses (speed +10%, quality −10%)' },
      { key: 'custom', label: 'Custom', desc: 'Tailored responses (speed −10%, quality +15%)' },
    ],
    default: 'basic',
  },
  coffee_quality: {
    label: 'Coffee Quality', icon: '☕',
    options: [
      { key: 'instant',  label: 'Instant',  desc: 'Basic coffee (1× mood recovery)' },
      { key: 'drip',     label: 'Drip',     desc: 'Good coffee (1.3× mood recovery)' },
      { key: 'espresso', label: 'Espresso', desc: 'Premium coffee (1.6× mood recovery)' },
    ],
    default: 'instant',
  },
  break_duration: {
    label: 'Break Policy', icon: '🛋️',
    options: [
      { key: 'short',    label: 'Short',    desc: 'Quick breaks, less recovery (0.7× duration)' },
      { key: 'normal',   label: 'Normal',   desc: 'Standard breaks' },
      { key: 'extended', label: 'Extended', desc: 'Long breaks, better recovery (1.5× duration)' },
    ],
    default: 'normal',
  },
  meeting_schedule: {
    label: 'Meeting Frequency', icon: '📅',
    options: [
      { key: 'weekly',   label: 'Weekly',   desc: 'Standups every week' },
      { key: 'biweekly', label: 'Biweekly', desc: 'Every 2 weeks' },
    ],
    default: 'weekly',
  },
  meeting_focus: {
    label: 'Meeting Focus', icon: '🧠',
    options: [
      { key: 'brainstorm', label: 'Brainstorm', desc: 'Creative focus (+skill, less mood)' },
      { key: 'review',     label: 'Review',     desc: 'Performance review (balanced)' },
      { key: 'planning',   label: 'Planning',   desc: 'Strategic planning (+mood)' },
    ],
    default: 'review',
  },
  lobby_style: {
    label: 'Lobby Style', icon: '🏢',
    options: [
      { key: 'casual',       label: 'Casual',       desc: 'Relaxed atmosphere (+1 rep/week)' },
      { key: 'professional', label: 'Professional', desc: 'Polished look (+2 rep/week)' },
      { key: 'premium',      label: 'Premium',      desc: 'Impressive space (+3 rep/week)' },
    ],
    default: 'casual',
  },
  data_server: {
    label: 'Analytics Dashboard', icon: '📊',
    options: [
      { key: 'open', label: 'Open Dashboard', desc: 'View business analytics' },
    ],
    default: 'open',
  },
  data_monitor: {
    label: 'Full Metrics', icon: '📈',
    options: [
      { key: 'open', label: 'Open Metrics', desc: 'View detailed funnel data' },
    ],
    default: 'open',
  },
  eng_methodology: {
    label: 'Dev Methodology', icon: '⚙️',
    options: [
      { key: 'agile',     label: 'Agile',     desc: 'Fast iterations (speed +20%, quality -10%)' },
      { key: 'balanced',  label: 'Balanced',   desc: 'Standard development' },
      { key: 'waterfall', label: 'Waterfall', desc: 'Thorough planning (speed -20%, quality +20%)' },
    ],
    default: 'balanced',
  },
  eng_stack: {
    label: 'Tech Stack', icon: '🧰',
    options: [
      { key: 'modern', label: 'Modern', desc: 'Cutting-edge tools (speed +15%, quality -5%)' },
      { key: 'stable', label: 'Stable', desc: 'Proven technologies (quality +10%)' },
    ],
    default: 'stable',
  },
  workshop_quality: {
    label: 'Build Quality', icon: '🔧',
    options: [
      { key: 'quick',   label: 'Quick',   desc: 'Fast turnaround (speed +30%, quality -20%)' },
      { key: 'precise', label: 'Precise', desc: 'High precision (speed -20%, quality +30%)' },
    ],
    default: 'quick',
  },
  workshop_tools: {
    label: 'Tool Grade', icon: '🛠️',
    options: [
      { key: 'basic', label: 'Basic', desc: 'Standard tools' },
      { key: 'pro',   label: 'Pro',   desc: 'Premium tools (+15% quality, +10% speed)' },
    ],
    default: 'basic',
  },
  marketing_channel: {
    label: 'Channel Focus', icon: '📣',
    options: [
      { key: 'paid',    label: 'Paid',    desc: 'Focus on paid ads (CPC -30%)' },
      { key: 'organic', label: 'Organic', desc: 'Focus on organic growth (+25% organic visitors)' },
      { key: 'both',    label: 'Both',    desc: 'Balanced approach' },
    ],
    default: 'both',
  },
  marketing_spend: {
    label: 'Ad Spend Level', icon: '💰',
    options: [
      { key: 'lean',       label: 'Lean',       desc: '$80/day — efficient but limited reach' },
      { key: 'standard',   label: 'Standard',   desc: '$200/day — balanced reach and cost' },
      { key: 'aggressive', label: 'Aggressive', desc: '$400/day — maximum reach, expensive' },
    ],
    default: 'standard',
  },
  sales_commission: {
    label: 'Commission Rate', icon: '💵',
    options: [
      { key: 'none',     label: 'No Bonus',  desc: 'Base deals, no commission cost' },
      { key: 'standard', label: 'Standard',  desc: '+15% deal value, 8% commission (best margin)' },
      { key: 'generous', label: 'Generous',  desc: '+25% deal value, 18% commission' },
      { key: 'lavish',   label: 'Lavish',    desc: '+30% deal value, 30% commission (low margin!)' },
    ],
    default: 'standard',
  },
  pr_approach: {
    label: 'PR Approach', icon: '📰',
    options: [
      { key: 'aggressive', label: 'Aggressive', desc: 'High visibility (reputation +2x, risk of backlash)' },
      { key: 'steady',     label: 'Steady',     desc: 'Consistent, reliable coverage' },
    ],
    default: 'steady',
  },
  perks_package: {
    label: 'Perks Package', icon: '🏋️',
    options: [
      { key: 'none',    label: 'None',    desc: 'No perks (free)' },
      { key: 'basic',   label: 'Basic',   desc: 'Sport pass — motivation +0.1/day ($15/day)' },
      { key: 'premium', label: 'Premium', desc: 'Sport + Cinema — motivation +0.2/day, mood +0.05/day ($35/day)' },
      { key: 'elite',   label: 'Elite',   desc: 'Full wellness — motivation +0.3/day, mood +0.1/day, energy +15% ($60/day)' },
    ],
    default: 'none',
  },
  workspace_quality: {
    label: 'Workspace Quality', icon: '🪑',
    options: [
      { key: 'basic',     label: 'Basic',     desc: 'Standard workspace (free)' },
      { key: 'ergonomic', label: 'Ergonomic', desc: 'Ergonomic desks — energy drain -10% ($20/day)' },
      { key: 'premium',   label: 'Premium',   desc: 'Premium workspace — energy drain -15%, motivation decay -20% ($40/day)' },
    ],
    default: 'basic',
  },
};

// ─── Company types ──────────────────────────────────────
export const COMPANY_TYPES = {
  digital_agency: {
    name: 'Digital Agency',
    icon: '🏢',
    tagline: 'Full-service marketing powerhouse',
    available: ['seo','content','video','design','data','sales','support','marketing','pr','hr','finance','legal','it'],
    startUnlocked: ['lobby','seo','content','support'],
    bonuses: { organicMultiplier: 1.2 },
  },
  saas_startup: {
    name: 'SaaS Startup',
    icon: '🚀',
    tagline: 'Build & scale a software product',
    available: ['engineering','design','content','data','sales','support','marketing','it','rd','hr','finance','legal'],
    startUnlocked: ['lobby','engineering','support'],
    bonuses: { projectPayMultiplier: 0.7, organicMultiplier: 0.5 },
  },
  ecommerce: {
    name: 'Online Store',
    icon: '🛒',
    tagline: 'Run an e-commerce empire',
    available: ['marketing','design','content','sales','support','warehouse','data','pr','hr','finance','it','legal'],
    startUnlocked: ['lobby','sales','warehouse','support'],
    bonuses: { marketingEfficiency: 1.3, bulkOrderChance: 0.10 },
  },
  creative_house: {
    name: 'Creative House',
    icon: '🎭',
    tagline: 'Premium creative & media studio',
    available: ['design','video','content','seo','sales','pr','marketing','hr','finance','support'],
    startUnlocked: ['lobby','design','content','support'],
    bonuses: { reputationGainMultiplier: 1.5 },
  },
  tech_lab: {
    name: 'Tech Lab',
    icon: '🧪',
    tagline: 'Cutting-edge R&D and innovation',
    available: ['engineering','data','design','sales','support','it','rd','marketing','hr','finance','legal'],
    startUnlocked: ['lobby','engineering','data'],
    bonuses: { rdInnovationRate: 1.5, projectPayMultiplier: 1.2 },
  },
  maker_co: {
    name: 'Maker Co.',
    icon: '🏭',
    tagline: 'Design, build & ship physical products',
    available: ['workshop','warehouse','engineering','design','sales','support','rd','hr','finance','legal','it'],
    startUnlocked: ['lobby','workshop','warehouse'],
    bonuses: { bulkOrderChance: 0.15 },
  },
  consulting_firm: {
    name: 'Consulting Firm',
    icon: '🏛️',
    tagline: 'Expert advice, data-driven strategy',
    available: ['data','engineering','content','sales','pr','marketing','support','hr','finance','legal','it'],
    startUnlocked: ['lobby','data','content','support'],
    bonuses: { reputationPayMultiplier: 2.0 },
  },
  staffing_agency: {
    name: 'Staffing Agency',
    icon: '🤝',
    tagline: 'Find the right people for every role',
    available: ['hr','support','sales','marketing','pr','finance','legal','it','data','content'],
    startUnlocked: ['lobby','hr','support','sales'],
    bonuses: { hireCostDiscount: 0.5, founderDemandMultiplier: 2.5 },
  },
};

// ─── Growth model definitions per company type ────────────
export const GROWTH_MODELS = {
  digital_agency:  { model: 'linear',      label: 'Linear Growth' },
  saas_startup:    { model: 'exponential',  label: 'Product-Led Growth' },
  ecommerce:       { model: 'physical',     label: 'Volume-Driven Growth' },
  creative_house:  { model: 'linear',       label: 'Reputation Growth' },
  tech_lab:        { model: 'exponential',  label: 'R&D-Led Growth' },
  maker_co:        { model: 'physical',     label: 'Manufacturing Growth' },
  consulting_firm: { model: 'premium',      label: 'Premium Growth' },
  staffing_agency: { model: 'linear',       label: 'Placement Growth' },
};

