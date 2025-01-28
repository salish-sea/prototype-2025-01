import { Observable } from "ol";
import { Temporal } from "temporal-polyfill";

export class TimeScale extends Observable {
  value: Temporal.Duration;

  constructor(initial: Temporal.Duration) {
    super();
    this.value = initial;
  }

  set(newValue: Temporal.Duration | string | null) {
    if (!newValue)
      return;

    newValue = Temporal.Duration.from(newValue);
    if (Temporal.Duration.compare(this.value, newValue) === 0)
      return;
    this.value = newValue;
    this.changed();
  }
}
