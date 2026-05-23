# Star-based Navigation — Altitude & Azimuth Calculator

This project calculates the apparent position of selected bright stars for a given observer location and UTC time.

## Features

- Latitude and longitude input
- UTC date-time input
- Julian Date calculation
- Greenwich Mean Sidereal Time (GMST)
- Local Sidereal Time (LST)
- Hour Angle
- Altitude
- Azimuth measured clockwise from true north
- Visibility status:
  - Observable
  - Near Horizon
  - Not Observable
- Optional atmospheric refraction correction
- CSV export

## Project Structure

```text
star-navigation-altaz/
├── index.html
├── style.css
├── app.js
└── README.md
```

## How to Run

Open `index.html` directly in a web browser.

No installation is required.

## Calculation Model

The calculation workflow is:

```text
UTC Date-Time → Julian Date → GMST → LST → Hour Angle → Altitude/Azimuth
```

Main equations:

```text
H = LST - α

sin(h) = sin(φ)sin(δ) + cos(φ)cos(δ)cos(H)
```

Where:

- `φ` = observer latitude
- `λ` = observer longitude
- `α` = right ascension
- `δ` = declination
- `H` = hour angle
- `h` = altitude

## Limitations

This is an educational geodetic astronomy calculator. The following effects are simplified or not included:

- Precession
- Nutation
- Proper motion
- Stellar parallax
- High-precision apparent place corrections

## Author

Levent Orhan
Geomatics Engineering
