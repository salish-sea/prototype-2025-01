import {Circle, Fill, Text, Stroke, Style} from 'ol/style';
import type { ObservationProperties } from './observation';
import type Feature from 'ol/Feature';
import type { Geometry } from 'ol/geom';
import { taxonByName } from './Taxon';

const black = '#000000';
const white = '#ffffff';
const transparentWhite = 'rgba(255, 255, 255, 0.4)';
const solidBlue = '#3399CC';

const tag = (observation: Feature<Geometry>) => {
  const {ecotype, pod, taxon} = observation.getProperties() as ObservationProperties;
  const taxonName = taxonByName[taxon.toLowerCase()].preferred_common_name;
  return pod || ecotype || taxonName[0];
}

const observationStyle2 = (observation: Feature<Geometry>, isSelected: boolean) => {
  const fill = new Fill({color: isSelected ? solidBlue : transparentWhite});
  const stroke = new Stroke({color: isSelected ? transparentWhite : solidBlue, width: 1.25});
  let text = tag(observation);
  return [
    new Style({
      image: new Circle({
        radius: 6,
        fill,
        stroke,
      }),
      fill,
      stroke,
    }),
    new Style({
      text: new Text({
        declutterMode: 'none',
        fill: new Fill({color: isSelected ? white : black}),
        font: '10px monospace',
        offsetY: 1.5,
        text,
        textBaseline: 'middle',
      }),
    }),
  ];
}

export const observationStyle = (observation: Feature<Geometry>) => {
  return observationStyle2(observation, false);
};

export const selectedObservationStyle = (observation: Feature<Geometry>) => {
  const {body, count, individuals, observedAt, taxon} = observation.getProperties() as ObservationProperties;
  let text = observedAt.toLocaleString('en-US', {dateStyle: 'short', timeZone: 'PST8PDT', timeStyle: 'short'});
  const taxonName = taxonByName[taxon.toLowerCase()].preferred_common_name;
  text += ` ${taxonName}`;
  if (count)
    text += ` (${count})`;
  if (body)
    text += '\n' + body.replaceAll(/(<br>)+/gi, '\n');
  return [
    ...observationStyle2(observation, true),
    new Style({
      text: new Text({
        backgroundFill: new Fill({color: 'rgba(255, 255, 255, 0.8)'}),
        declutterMode: 'obstacle',
        offsetX: 8,
        text,
        textAlign: 'left',
      })
    })
  ];
};
