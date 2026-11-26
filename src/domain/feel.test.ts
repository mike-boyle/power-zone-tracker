import { describe, expect, it } from 'vitest';
import { suggestFtpChange, type Feel, type RatedRide } from './feel';
import type { RideType } from './ride';

const TYPES: Record<string, RideType> = {
  pz: 'power',
  pzm: 'max',
  pze: 'endurance',
  rec: 'recovery',
  ftp: 'test',
};
const typeOf = (rideId: string) => TYPES[rideId];

let n = 0;
function ride(rideId: string, feel: Feel | undefined, ftp = 200): RatedRide {
  return { id: `r${n++}`, rideId, ftp, feel };
}

describe('suggestFtpChange', () => {
  it('suggests nothing without an FTP or ratings', () => {
    expect(suggestFtpChange([ride('pz', 'easy')], null, typeOf)).toBeNull();
    expect(suggestFtpChange([], 200, typeOf)).toBeNull();
    expect(suggestFtpChange([ride('pz', undefined)], 200, typeOf)).toBeNull();
  });

  it('raises FTP 3% after three easy rides including intervals', () => {
    const s = suggestFtpChange(
      [ride('pze', 'easy'), ride('pz', 'easy'), ride('pze', 'easy')],
      200,
      typeOf,
    );
    expect(s).toMatchObject({ direction: 'up', from: 200, to: 206 });
  });

  it("doesn't raise for easy endurance rides alone", () => {
    const rides = [ride('pze', 'easy'), ride('pze', 'easy'), ride('pze', 'easy')];
    expect(suggestFtpChange(rides, 200, typeOf)).toBeNull();
  });

  it("doesn't raise when only two of three felt easy", () => {
    const rides = [ride('pz', 'easy'), ride('pzm', 'right'), ride('pz', 'easy')];
    expect(suggestFtpChange(rides, 200, typeOf)).toBeNull();
  });

  it('lowers FTP 4% when two of the last three felt too hard', () => {
    const s = suggestFtpChange(
      [ride('pz', 'tooHard'), ride('pze', 'right'), ride('pzm', 'tooHard')],
      200,
      typeOf,
    );
    expect(s).toMatchObject({ direction: 'down', from: 200, to: 192 });
  });

  it('lowers after two too-hard rides even before a third', () => {
    const s = suggestFtpChange([ride('pz', 'tooHard'), ride('pz', 'tooHard')], 200, typeOf);
    expect(s?.direction).toBe('down');
  });

  it('ignores recovery rides, tests, and rides at another FTP', () => {
    const rides = [
      ride('pz', 'easy', 190), // old FTP
      ride('rec', 'easy'),
      ride('ftp', 'easy'),
      ride('pz', 'easy'),
      ride('pze', 'easy'),
    ];
    // Only two qualifying rides at 200 W: not enough to raise.
    expect(suggestFtpChange(rides, 200, typeOf)).toBeNull();
  });

  it('only looks at the most recent rides', () => {
    const rides = [
      ride('pz', 'tooHard'),
      ride('pz', 'tooHard'),
      ride('pz', 'easy'),
      ride('pzm', 'easy'),
      ride('pze', 'easy'),
    ];
    expect(suggestFtpChange(rides, 200, typeOf)?.direction).toBe('up');
  });

  it('keys each suggestion to the latest ride so a dismissal only hides that one', () => {
    const rides = [ride('pz', 'easy'), ride('pz', 'easy'), ride('pzm', 'easy')];
    const first = suggestFtpChange(rides, 200, typeOf)!;
    const second = suggestFtpChange([...rides, ride('pz', 'easy')], 200, typeOf)!;
    expect(first.key).not.toBe(second.key);
  });
});
