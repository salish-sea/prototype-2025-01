import type Map from 'ol/Map';
import { Control } from "ol/control";
import Draw from 'ol/interaction/Draw';
import type { Vector } from 'ol/source';
import { taxonByName } from "../Taxon";
import { Geometry, LineString, Point } from 'ol/geom';
import { Feature } from 'ol';
import { bearingStyle, observationStyle, sighterStyle } from "../style";
import { Temporal } from 'temporal-polyfill';
import { toNaiveISO } from '../PointInTime';

const taxa = [
  'Zalophus californianus',
  'Eumetopias jubatus',
  'Eschrichtius robustus',
  'Megaptera novaeangliae',
  'Orcinus orca',
  'Orcinus orca ater',
  'Orcinus orca rectipinnus',
];

const subjectFeatureId = 'subject-feature';
const observerFeatureId = 'observer-feature';
const bearingFeatureId = 'observer-subject-bearing';

const bindInputToFeature = (input: HTMLInputElement, feature: Feature<Point>, map: Map, source: Vector) => {
  const draw = new Draw({source, type: 'Point'});
  draw.on('drawend', (e) => {
    const placeholder = e.feature.getGeometry() as Point;
    const coordinates = placeholder.getCoordinates();
    feature.getGeometry()!.setCoordinates(coordinates);
    updateInput();
    setTimeout(() => { source.removeFeature(e.feature)}, 0);
  });

  const updateGeometry = () => {
    const value = input.value;
    const match = value.match(/^\s*(-[0-9]{3}.[0-9]+),\s*([0-9][0-9].[0-9]+)\s*$/);
    if (match) {
      const [, lon, lat] = match.map(v => parseFloat(v));
      const point = new Point([lon, lat]);

      feature.setGeometry(point);
      map.removeInteraction(draw);
    } else {
      map.addInteraction(draw);
      return;
    }
  }
  input.addEventListener('input', updateGeometry);
  input.addEventListener('focus', updateGeometry);

  const updateInput = () => {
    const geometry = feature.getGeometry();
    if (!geometry) {
      input.value = '';
    } else if (geometry instanceof Point) {
      map.removeInteraction(draw);
      input.value = geometry.getCoordinates().
        map(coord => coord.toFixed(5)).
        join(', ');
    }
  }

  feature.getGeometry()!.addEventListener('change', () => {
    updateInput()
  });

  const initialCoordinates = feature.getGeometry()?.getCoordinates();
  if (initialCoordinates && initialCoordinates[0] !== 0)
    updateInput();
}

export default class NewObservationControl extends Control {
  constructor({map, source}: {map: Map, source: Vector<Feature<Geometry>>}) {
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

    const subjectFeature = source.getFeatureById(subjectFeatureId) as Feature<Point> | null || new Feature({
      geometry: new Point([0, 0]),
      taxon: taxonSelect.value
    });
    subjectFeature.setId(subjectFeatureId);
    subjectFeature.setStyle(observationStyle);
    if (!subjectFeature.get('observedAt'))
      subjectFeature.set('observedAt', toNaiveISO(Temporal.Now.instant()));
    if (!subjectFeature.get('taxon'))
      subjectFeature.set('taxon', 'Orcinus orcas');
    taxonSelect.value = subjectFeature.get('taxon');
    source.addFeature(subjectFeature);
    const subjectLocationLabel = document.createElement('label');
    subjectLocationLabel.innerText = 'Where was it?';
    const subjectLocation = document.createElement('input');
    subjectLocation.type = 'text';
    subjectLocation.size = 16;
    bindInputToFeature(subjectLocation, subjectFeature, map, source);
    subjectLocationLabel.appendChild(subjectLocation);
    form.appendChild(subjectLocationLabel);

    const observerFeature = source.getFeatureById(observerFeatureId) as Feature<Point> | null || new Feature({
      geometry: new Point([0, 0]),
    });
    observerFeature.setId(observerFeatureId);
    observerFeature.setStyle(sighterStyle);
    source.addFeature(observerFeature);
    const observerLocationLabel = document.createElement('label');
    observerLocationLabel.innerText = 'Where were you?';
    const observerLocation = document.createElement('input');
    observerLocation.type = 'text';
    observerLocation.size = 16;
    bindInputToFeature(observerLocation, observerFeature, map, source);
    observerLocationLabel.appendChild(observerLocation);
    form.appendChild(observerLocationLabel);

    const observedAtLabel = document.createElement('label');
    observedAtLabel.innerText = 'When did you see it?';
    const observedAtInput = document.createElement('input');
    observedAtInput.value = subjectFeature.get('observedAt') || '';
    observedAtInput.addEventListener('change', () => {
      subjectFeature.set('observedAt', observedAtInput.value);
    });
    observedAtInput.type = 'datetime-local';
    observedAtLabel.appendChild(observedAtInput);
    form.appendChild(observedAtLabel);

    const bearingLine = source.getFeatureById(bearingFeatureId) as Feature<LineString> | null || new Feature<LineString>();
    bearingLine.setId(bearingFeatureId);
    bearingLine.setStyle(bearingStyle);
    const recomputeBearing = () => {
      const observerCoordinates = observerFeature.getGeometry()!.getCoordinates();
      const subjectCoordinates = subjectFeature.getGeometry()!.getCoordinates();
      if (observerCoordinates[0] < 100 && subjectCoordinates[0] < 100)
        bearingLine.setGeometry(new LineString([observerCoordinates, subjectCoordinates]));
      else
        bearingLine.setGeometry(undefined);
    };
    observerFeature.getGeometry()!.addEventListener('change', recomputeBearing);
    subjectFeature.getGeometry()!.addEventListener('change', recomputeBearing);
    recomputeBearing();
    source.addFeature(bearingLine);

    super({element: container});

    addButton.addEventListener('click', () => {
      container.classList.toggle('inactive');
    });
    taxonSelect.addEventListener('change', () => {
      subjectFeature.set('taxon', taxonSelect.value);
    });
  }
}
