import { Control } from "ol/control";
import { Temporal } from "temporal-polyfill";
import type { PointInTime } from "../PointInTime";

export default class TimeControl extends Control {
  constructor({pit}: {pit: PointInTime}) {
    const container = document.createElement('div');
    container.className = 'time-control ol-unselectable ol-control';

    const input = document.createElement('input');
    input.type = 'datetime-local';
    input.value = pit.toNaiveISO() || '';
    input.min = '1900-01-01T00:00';
    input.max = (new Date()).toISOString().slice(0, 16);
    container.appendChild(input);

    super({element: container})

    input.addEventListener('change', e => {
      console.log('time control changed');
      const target = e.target as HTMLInputElement;
      try {
        const time = Temporal.PlainDateTime.from(target.value).toZonedDateTime('PST8PDT').toInstant();
        pit.set(time);
      } catch (error) {
        console.error(`Couldn't parse time '${target.value}': ${error}`);
        e.preventDefault();
      }
    }, {passive: false});
  }
}
