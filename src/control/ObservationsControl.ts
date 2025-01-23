import { Control } from "ol/control";
import { FeatureLike } from "ol/Feature";
import { ObservationProperties } from "../observation";

export default class ObservationsControl extends Control {
  constructor({}) {
    const container = document.createElement('div');
    container.className = 'observations-control ol-unselectable ol-control';

    const inner = document.createElement('div');
    inner.innerText = "Observations!";
    container.appendChild(inner);

    super({element: container});
  }

  showObservations(observations: FeatureLike[]) {
    this.element.innerHTML = '<div>' +
      observations.map(obs => {
        const {kind, observedAt} = obs.getProperties() as ObservationProperties;
        return `<div>${kind}: ${observedAt ? observedAt.toLocaleString('en-US', {timeZone: 'PST8PDT'}) : 'undated'}</div>`;
      }).join('\r') +
      '</div>';
  }
}
