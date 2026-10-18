// Scene values (radius, distance) are scaled for viewing, not true scale.
// Orbital periods are real, so relative orbit speeds are correct.
// Rotation periods are real too, but the spin rate is only used for visuals.
// Info values: NASA planetary fact sheets (rounded).

export const BODIES = [
  {
    key: "sun",
    name: "Sun",
    type: "G-type main-sequence star",
    radius: 6,
    distance: 0,
    periodDays: 0,
    rotationHours: 609,
    tilt: 7.25,
    info: {
      diameter: "1,392,700 km",
      distance: "—",
      period: "—",
      fact: "The Sun holds about 99.8% of all the mass in the Solar System."
    }
  },
  {
    key: "mercury",
    name: "Mercury",
    type: "Terrestrial planet",
    radius: 0.5,
    distance: 10,
    periodDays: 88,
    rotationHours: 1407.6,
    tilt: 0.03,
    info: {
      diameter: "4,879 km",
      distance: "57.9 million km (0.39 AU)",
      period: "88 days",
      fact: "One solar day on Mercury (sunrise to sunrise) lasts about 176 Earth days, longer than its year."
    }
  },
  {
    key: "venus",
    name: "Venus",
    type: "Terrestrial planet",
    radius: 0.95,
    distance: 14,
    periodDays: 224.7,
    rotationHours: 5832.5,
    // tilt over 90° means it spins "backwards" (retrograde)
    tilt: 177.4,
    info: {
      diameter: "12,104 km",
      distance: "108.2 million km (0.72 AU)",
      period: "225 days",
      fact: "The hottest planet, around 465 °C at the surface, because its thick CO₂ atmosphere traps heat."
    }
  },
  {
    key: "earth",
    name: "Earth",
    type: "Terrestrial planet",
    radius: 1,
    distance: 19,
    periodDays: 365.25,
    rotationHours: 23.9,
    tilt: 23.4,
    info: {
      diameter: "12,756 km",
      distance: "149.6 million km (1 AU)",
      period: "365.25 days",
      fact: "The only known world with liquid water on its surface, and the only one known to host life."
    }
  },
  {
    key: "moon",
    name: "Moon",
    type: "Natural satellite of Earth",
    parent: "earth",
    radius: 0.27,
    distance: 2.2, // from Earth
    periodDays: 27.3,
    inclination: 5.1,
    info: {
      diameter: "3,475 km",
      distance: "~1 AU (384,400 km from Earth)",
      period: "27.3 days (around Earth)",
      fact: "It is tidally locked, so the same side always faces Earth."
    }
  },
  {
    key: "mars",
    name: "Mars",
    type: "Terrestrial planet",
    radius: 0.6,
    distance: 25,
    periodDays: 687,
    rotationHours: 24.6,
    tilt: 25.2,
    info: {
      diameter: "6,792 km",
      distance: "227.9 million km (1.52 AU)",
      period: "687 days",
      fact: "Home to Olympus Mons, the tallest known volcano in the Solar System, about 22 km high."
    }
  },
  {
    key: "jupiter",
    name: "Jupiter",
    type: "Gas giant",
    radius: 3.2,
    distance: 36,
    periodDays: 4331,
    rotationHours: 9.9,
    tilt: 3.1,
    info: {
      diameter: "142,984 km",
      distance: "778.5 million km (5.2 AU)",
      period: "11.9 years",
      fact: "Its Great Red Spot is a storm wider than Earth that has been observed for over 150 years."
    }
  },
  {
    key: "saturn",
    name: "Saturn",
    type: "Gas giant",
    radius: 2.7,
    distance: 50,
    periodDays: 10747,
    rotationHours: 10.7,
    tilt: 26.7,
    rings: { inner: 3.4, outer: 6.2 },
    info: {
      diameter: "120,536 km",
      distance: "1.43 billion km (9.5 AU)",
      period: "29.4 years",
      fact: "Its average density is lower than water's. The rings are mostly chunks of water ice."
    }
  },
  {
    key: "uranus",
    name: "Uranus",
    type: "Ice giant",
    radius: 1.8,
    distance: 64,
    periodDays: 30589,
    rotationHours: 17.2,
    tilt: 97.8,
    info: {
      diameter: "51,118 km",
      distance: "2.87 billion km (19.2 AU)",
      period: "84 years",
      fact: "Its axis is tilted about 98°, so it essentially rolls around the Sun on its side."
    }
  },
  {
    key: "neptune",
    name: "Neptune",
    type: "Ice giant",
    radius: 1.75,
    distance: 76,
    periodDays: 59800,
    rotationHours: 16.1,
    tilt: 28.3,
    info: {
      diameter: "49,528 km",
      distance: "4.5 billion km (30.1 AU)",
      period: "164.8 years",
      fact: "It has the fastest winds measured in the Solar System, over 2,000 km/h."
    }
  }
];

// At 1× speed one Earth year takes this many seconds.
export const EARTH_YEAR_SECONDS = 30;
