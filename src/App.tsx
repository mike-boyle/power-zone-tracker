import { Match, Show, Switch, createMemo } from 'solid-js';
import { currentRoute, type Route } from './router';
import { TabBar } from './components/TabBar';
import { ActiveRideBanner } from './components/ActiveRideBanner';
import { TodayPage } from './pages/TodayPage';
import { ProgramsPage } from './pages/ProgramsPage';
import { ProgramSetupPage } from './pages/ProgramSetupPage';
import { PlanPage } from './pages/PlanPage';
import { LibraryPage } from './pages/LibraryPage';
import { RideDetailPage } from './pages/RideDetailPage';
import { PlayerPage } from './pages/PlayerPage';
import { SummaryPage } from './pages/SummaryPage';
import { YouPage } from './pages/YouPage';
import { NotFoundPage } from './pages/NotFoundPage';

/** Narrow the current route to one with params, for `<Match>`'s keyed callback. */
function routeNamed<N extends Route['name']>(route: () => Route, name: N) {
  return () => {
    const r = route();
    return r.name === name ? (r as Extract<Route, { name: N }>) : undefined;
  };
}

export function App() {
  const route = createMemo(currentRoute);
  const fullScreen = () => route().name === 'play';
  const programRoute = routeNamed(route, 'program');
  const rideRoute = routeNamed(route, 'ride');
  const summaryRoute = routeNamed(route, 'summary');

  return (
    <>
      <Show when={!fullScreen()}>
        <ActiveRideBanner />
      </Show>
      <Switch fallback={<NotFoundPage />}>
        <Match when={route().name === 'today'}>
          <TodayPage />
        </Match>
        <Match when={route().name === 'programs'}>
          <ProgramsPage />
        </Match>
        <Match when={programRoute()}>{(r) => <ProgramSetupPage id={r().id} />}</Match>
        <Match when={route().name === 'plan'}>
          <PlanPage />
        </Match>
        <Match when={route().name === 'library'}>
          <LibraryPage />
        </Match>
        <Match when={rideRoute()}>
          {(r) => <RideDetailPage id={r().id} week={r().week} index={r().index} />}
        </Match>
        <Match when={route().name === 'play'}>
          <PlayerPage />
        </Match>
        <Match when={summaryRoute()}>{(r) => <SummaryPage id={r().id} />}</Match>
        <Match when={route().name === 'you'}>
          <YouPage />
        </Match>
      </Switch>
      <Show when={!fullScreen()}>
        <TabBar active={route().name} />
      </Show>
    </>
  );
}
