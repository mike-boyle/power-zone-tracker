import { createSignal } from 'solid-js';
import { getRide } from '../domain/library';
import { discardRide, openRide, state } from '../state/store';
import type { PlanRef } from '../state/types';
import { navigate } from '../router';
import { unlockAudio } from '../lib/cues';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';

function sameRef(a?: PlanRef, b?: PlanRef): boolean {
  if (!a || !b) return a === b;
  return a.planId === b.planId && a.week === b.week && a.index === b.index;
}

/**
 * Opens a ride in the player. If a different ride is already open, asks
 * whether to resume it or throw it away first.
 */
export function StartRideButton(props: {
  rideId: string;
  planRef?: PlanRef;
  label?: string;
  size?: 'md' | 'lg' | 'xl';
  block?: boolean;
}) {
  const [confirming, setConfirming] = createSignal(false);
  const activeName = () => {
    const active = state.activeRide;
    return active ? (getRide(active.rideId)?.name ?? 'A ride') : '';
  };
  const isCurrent = () => {
    const active = state.activeRide;
    return !!active && active.rideId === props.rideId && sameRef(active.planRef, props.planRef);
  };

  const begin = () => {
    openRide(props.rideId, props.planRef);
    navigate('/play');
  };

  const onClick = () => {
    // Must happen inside the tap so iOS allows the countdown beeps later.
    unlockAudio();
    if (isCurrent()) navigate('/play');
    else if (state.activeRide) setConfirming(true);
    else begin();
  };

  return (
    <>
      <Button
        variant="primary"
        size={props.size ?? 'xl'}
        block={props.block ?? true}
        onClick={onClick}
      >
        {isCurrent() ? 'Resume ride' : (props.label ?? 'Ride this')}
      </Button>
      <Dialog
        open={confirming()}
        onClose={() => setConfirming(false)}
        title="Another ride is open"
        actions={
          <>
            <Button
              variant="primary"
              size="lg"
              block
              onClick={() => {
                setConfirming(false);
                navigate('/play');
              }}
            >
              Resume {activeName()}
            </Button>
            <Button
              variant="danger"
              size="lg"
              block
              onClick={() => {
                setConfirming(false);
                discardRide();
                begin();
              }}
            >
              Discard it and start this one
            </Button>
            <Button variant="ghost" block onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <p>{activeName()} hasn't been finished. Starting a new ride will discard it.</p>
      </Dialog>
    </>
  );
}
