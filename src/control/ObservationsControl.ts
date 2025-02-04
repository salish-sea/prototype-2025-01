import { Control } from "ol/control";
import { FeatureLike } from "ol/Feature";
import { ObservationProperties } from "../observation";
import { PointInTime } from "../PointInTime";
import VectorSource from "ol/source/Vector";
import type Select from "ol/interaction/Select";

export default class ObservationsControl extends Control {
  constructor({pit}: {pit: PointInTime}) {
    const container = document.createElement('div');
    container.className = 'observations-control ol-unselectable ol-control';

    const inner = document.createElement('div');
    inner.innerText = "Observations!";
    container.appendChild(inner);

    super({element: container});

    container.addEventListener('click', e => {
      if (!(e.target instanceof HTMLTimeElement))
        return;
      pit.set(e.target.getAttribute('datetime'));
      e.preventDefault();
    });
  }

  showObservations(observations: FeatureLike[]) {
    this.element.innerHTML = '<div>' +
      observations.map(obs => {
        let {body, count, kind, observedAt} = obs.getProperties() as ObservationProperties;
        const time = observedAt ? `<a href='focusTime'><time datetime="${observedAt.toString()}">${observedAt.toLocaleString('en-US', {timeZone: 'PST8PDT'})}</time></a>`
          : 'undated';
        body = body?.trim() || '';
        body = body.replace(new RegExp('^(\s*<br>)*'), '');
        const bodyHTML = body ? `<dd>${body}</dd>` : '';
        return `<dt>${time}: ${kind} (${count})</dt>${bodyHTML}`;
      }).join('\r<br>\r') +
      '</div>';
  }
}
