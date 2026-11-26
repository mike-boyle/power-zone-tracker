import { For } from 'solid-js';
import { ZONES, ZONE_INFO, formatWattRange, wattRange } from '../domain/zones';
import { ZoneChip } from '../ui/Badges';
import styles from './ZoneTable.module.css';

export function ZoneTable(props: { ftp: number }) {
  return (
    <table class={styles.table}>
      <caption class="visually-hidden">Power zones for an FTP of {props.ftp} watts</caption>
      <thead class="visually-hidden">
        <tr>
          <th scope="col">Zone</th>
          <th scope="col">Name</th>
          <th scope="col">Percent of FTP</th>
          <th scope="col">Watts</th>
        </tr>
      </thead>
      <tbody>
        <For each={ZONES}>
          {(zone) => {
            const info = ZONE_INFO[zone];
            const pct =
              info.high === null
                ? `> ${Math.round(info.low * 100)}%`
                : `${zone === 1 ? 0 : Math.round(info.low * 100) + 1}–${Math.round(info.high * 100)}%`;
            return (
              <tr>
                <td>
                  <ZoneChip zone={zone} />
                </td>
                <td class={styles.name}>{info.name}</td>
                <td class={styles.pct}>{pct}</td>
                <td class={styles.watts}>{formatWattRange(wattRange(props.ftp, zone))} W</td>
              </tr>
            );
          }}
        </For>
      </tbody>
    </table>
  );
}
