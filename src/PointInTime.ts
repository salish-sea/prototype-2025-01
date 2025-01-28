import { Temporal } from 'temporal-polyfill';
import { Observable } from 'ol';

const oneDay = Temporal.Duration.from({hours: 48});

export class PointInTime extends Observable {
  value: Temporal.Instant | null = null;

  // format is YYYY-MM-DDTHH:mm, timezone is PST8PDT
  set(value: Temporal.Instant | string | null) {
    const prevValue = this.value;
    try {
      if (!value) {
        this.value = null;
      } else if (value instanceof Temporal.Instant) {
        this.value = value;
      } else if (value.endsWith('Z')) {
        this.value = Temporal.Instant.from(value);
      } else {
        this.value = Temporal.PlainDateTime.from(value).toZonedDateTime('PST8PDT').toInstant();
      }
    } catch (error) {
      console.log(`error setting pit value: ${error}`);
      this.value = null;
    }
    if (prevValue !== this.value)
      this.changed();
  }

  toNaiveISO(): string | null {
    return this.value ? this.value.toZonedDateTimeISO('PST8PDT').toPlainDateTime().toString({ smallestUnit: 'minute' }) : null;
  }

  toPlainDate(): Temporal.PlainDate | null {
    return this.value?.toZonedDateTimeISO('PST8PDT').toPlainDate() || null;
  }
}
