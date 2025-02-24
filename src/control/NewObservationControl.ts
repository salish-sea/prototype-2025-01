import type Map from 'ol/Map';
import { Control } from "ol/control";
import Draw from 'ol/interaction/Draw';
import type { Vector } from 'ol/source';
import { taxonByName } from "../Taxon";
import { Point } from 'ol/geom';
import { Feature } from 'ol';
import { observationStyle, sighterStyle } from "../style";

const taxa = [
  'Zalophus californianus',
  'Eumetopias jubatus',
  'Eschrichtius robustus',
  'Megaptera novaeangliae',
  'Orcinus orca',
  'Orcinus orca ater',
  'Orcinus orca rectipinnus',
];

const bindInputToFeature = (input: HTMLInputElement, feature: Feature<Point>, map: Map, source: Vector) => {
  const updateGeometry = () => {
    const value = input.value;
    const match = value.match(/^\s*(-[0-9]{3}.[0-9]+),\s*([0-9][0-9].[0-9]+)\s*$/);
    if (!match) {
      return;
    }
    const [, lon, lat] = match.map(v => parseFloat(v));
    const point = new Point([lon, lat]);

    feature.setGeometry(point);
  }
  input.addEventListener('input', updateGeometry);
  input.addEventListener('focus', () => {
    if (input.value.trim() === '') {
      const draw = new Draw({source, type: 'Point'});
      map.addInteraction(draw);
      draw.on('drawend', (e) => {
        const placeholder = e.feature.getGeometry() as Point;
        const coordinates = placeholder.getCoordinates();
        feature.getGeometry()!.setCoordinates(coordinates);
        updateInput();
        map.removeInteraction(draw);
        draw.abortDrawing();
      })
    }
  });
  updateGeometry();

  const updateInput = () => {
    const geometry = feature.getGeometry();
    if (!geometry) {
      input.value = '';
    } else if (geometry instanceof Point) {
      input.value = geometry.getCoordinates().
        map(coord => coord.toFixed(5)).
        join(', ');
    }
  }

  feature.addChangeListener('geometry', () => {
    console.log('geometry changed');
  });
  feature.getGeometry()!.addEventListener('change', () => {
    updateInput()
  });
}

export default class NewObservationControl extends Control {
  constructor({map, source}: {map: Map, source: Vector}) {
    const container = document.createElement('div');
    container.className = 'new-observation-control ol-unselectable ol-control inactive';

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.innerText = '+ New observation';
    container.appendChild(addButton);

    const form = document.createElement('form');
    container.appendChild(form);

    const taxonLabel = document.createElement('label');
    taxonLabel.innerText = 'What did you see?';
    const taxonSelect = document.createElement('select');
    for (const taxonName of taxa) {
      const commonName = taxonByName[taxonName.toLowerCase()].preferred_common_name;
      const option = document.createElement('option');
      option.value = taxonName;
      option.innerText = commonName;
      taxonSelect.appendChild(option);
    }
    taxonLabel.appendChild(taxonSelect);
    form.appendChild(taxonLabel);

    const subjectFeature = new Feature({geometry: new Point([0, 0]), taxon: taxonSelect.value});
    subjectFeature.setId("new-observation");
    subjectFeature.setStyle(observationStyle);
    source.addFeature(subjectFeature);
    const subjectLocationLabel = document.createElement('label');
    subjectLocationLabel.innerText = 'Where was it?';
    const subjectLocation = document.createElement('input');
    subjectLocation.type = 'text';
    subjectLocation.size = 15;
    bindInputToFeature(subjectLocation, subjectFeature, map, source);

    subjectLocationLabel.appendChild(subjectLocation);
    form.appendChild(subjectLocationLabel);

    super({element: container});

    addButton.addEventListener('click', () => {
      container.classList.toggle('inactive');
    });
    taxonSelect.addEventListener('change', () => {
      subjectFeature.set('taxon', taxonSelect.value);
    });
  }
}
