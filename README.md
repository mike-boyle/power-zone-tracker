# Power Zone Tracker

Power zone training plans and a ride timer, built for a phone on the handlebars of an
indoor bike. Pick a program, then each day tap **Start ride** and follow along: the
screen shows your zone, its watt range from your FTP, a countdown for the interval,
what's next, and a graph of the whole ride.

## What's in it

- **Programs** built in 4-week blocks (three weeks building, then a lighter week), for 3
  to 6 rides a week. You choose whether to test FTP at the start, between blocks, and at
  the end:
  - **Comeback** (4 weeks): easing back in after time off
  - **Base Builder** (8 weeks): rebuilding an aerobic base
  - **Endurance 12**: mostly endurance, fewer hard days
  - **Balanced 12**: Power Zone, Max and endurance every week
  - **Performance 12**: the highest training load
- **69 structured rides**: Endurance, Power Zone, Max and Recovery rides from 20 to 90
  minutes, plus a 20-minute FTP test that calculates your new FTP.
- **Ride player**: zone colour, watt range, interval countdown, next interval, whole-ride
  graph, countdown beeps, optional voice cues, keeps the screen awake, and survives
  the phone locking or the page reloading.
- Estimated **TSS** for every ride and week, and a history of what you've ridden.
- Works offline once loaded, and can be added to your Home Screen. Light and dark
  themes follow your system setting.

All data stays on your device (browser storage). Use **You → Save backup** now and then.

## Running it

```sh
npm install
npm run dev
```

Live at **https://mike-boyle.github.io/power-zone-tracker/**. Every push to `main`
deploys there through GitHub Actions. On your phone, open it and use **Add to Home
Screen** so it runs full-screen and keeps its data.

For local testing, open the "Network" URL Vite prints on your phone (same Wi-Fi).
Screen wake lock and offline support only work over HTTPS, so use the live site for
real rides.

## Development

```sh
npm run check   # typecheck, unit tests, formatting
npm run build   # production build in dist/
```

See [CLAUDE.md](CLAUDE.md) for architecture and conventions.

TSS® and Training Stress Score® are trademarks of TrainingPeaks, LLC. This project
isn't affiliated with Peloton or TrainingPeaks.
