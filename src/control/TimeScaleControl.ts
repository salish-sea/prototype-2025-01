import { Control } from "ol/control";
import { TimeScale } from "../TimeScale";
import { Temporal } from "temporal-polyfill";

const durations: Temporal.Duration[] = [
  'PT2H',
  'PT6H',
  'P2D',
  'P7D',
  'P30D',
].map(Temporal.Duration.from);

export class TimeScaleControl extends Control {
  constructor({timeScale}: {timeScale: TimeScale}) {
    const container = document.createElement('div');
    container.className = 'time-scale-control ol-unselectable ol-control';

    const input = document.createElement('select');
    container.appendChild(input);

    for (const duration of durations) {
      const option = document.createElement('option');
      option.value = duration.toString();
      option.innerText = duration.toLocaleString('en-US');
      option.selected = Temporal.Duration.compare(duration, timeScale.value) === 0;
      input.appendChild(option);
    }

    super({element: container})

    input.addEventListener('change', e => {
      const target = e.target as HTMLSelectElement;
      timeScale.set(target.value);
    })
  }
}
