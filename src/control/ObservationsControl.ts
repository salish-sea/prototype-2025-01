import { Control } from "ol/control";
import { FeatureLike } from "ol/Feature";
import { ObservationProperties } from "../observation";
import { PointInTime } from "../PointInTime";
import { taxonByName } from "../Taxon";

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
      let {body, count, taxon, heading, individuals, observedAt, source, url} = obs.getProperties() as ObservationProperties;
      const commonName = taxonByName[taxon.toLowerCase()]?.preferred_common_name || taxon;
      const time = observedAt ? `<a href='focusTime'><time datetime="${observedAt.toString()}">${observedAt.toLocaleString('en-US', {timeZone: 'PST8PDT'})}</time></a>`
        : 'undated';
      const term = document.createElement('dt');
      term.innerHTML = `${time}:` + (count ? ` ${count}x` : '') + ` <b>${commonName}</b>` + (url ? ` via <a href="${url}">${source}</a>` : ` via ${source}`);
      container.appendChild(term);

      let tags: string[] = [...individuals];
      if (heading)
        tags.push(heading);
      if (tags.length > 0) {
        const def = document.createElement('dd');
        def.innerText = 'Tags: ' + tags.join(', ');
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
