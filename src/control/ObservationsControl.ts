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
    const container = document.createElement('div');
    for (const obs of observations) {
      let {body, count, kind, lifeforms, observedAt} = obs.getProperties() as ObservationProperties;
      const time = observedAt ? `<a href='focusTime'><time datetime="${observedAt.toString()}">${observedAt.toLocaleString('en-US', {timeZone: 'PST8PDT'})}</time></a>`
        : 'undated';
      const term = document.createElement('dt');
      term.innerHTML = `${time}: ${kind} (${count})`;
      container.appendChild(term);

      if (lifeforms && lifeforms.length > 0) {
        const def = document.createElement('dd');
        def.innerText = 'Tags: ' + lifeforms.join(', ');
        container.appendChild(def);
      }

      body = body || '';
      body = body.replace(/^(\s*<br>)*/, '');
      body = body.replace(/<br>\s*<br>\s/, '<br>');
      body = body.trim();
      if (body) {
        const def = document.createElement('dd');
        def.innerHTML = body;
        container.appendChild(def);
      }
    }
    this.element.innerHTML = container.outerHTML;
  }
}
