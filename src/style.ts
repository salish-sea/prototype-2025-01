import {Circle, Fill, Text, Stroke, Style, Icon} from 'ol/style';
import type { ObservationProperties } from './observation';
import type Feature from 'ol/Feature';
import { Point, type Geometry, type LineString } from 'ol/geom';
import { taxonByName } from './Taxon';
import { bearing as getBearing } from "@turf/bearing";
import { point as turfPoint } from "@turf/helpers";
import { getDistance, getLength } from 'ol/sphere';

const black = '#000000';
const white = '#ffffff';
const transparentWhite = 'rgba(255, 255, 255, 0.4)';
const solidBlue = '#3399CC';

const tag = (observation: Feature<Geometry>) => {
  const {ecotype, pod, taxon} = observation.getProperties() as Partial<ObservationProperties>;
  if (!taxon)
    return '?';
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

export const pliantObservationStyle = (observation: Feature<Geometry>) => {
  return observationStyle2(observation, true);
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

export const sighterStyle = new Style({
  text: new Text({
    declutterMode: 'none',
    text: '👁️‍🗨️',
  }),
});

export const bearingStyle = (feature: Feature<LineString>) => {
  const geom = feature.getGeometry();
  const styles = [
    new Style({
      stroke: new Stroke({
        color: '#0000ff',
        lineDash: [3, 6],
        width: 1.5,
      }),
    }),
  ];

  if (geom) {
    const [p1, p2] = geom.getCoordinates();
    const distance = (getDistance(p1, p2) / 1000).toFixed(1);
    const coords = geom.getCoordinates().map(coord => turfPoint(coord));
    const bearing = getBearing(coords[0], coords[1]).toFixed(0);
    styles.push(new Style({
      text: new Text({
        backgroundFill: new Fill({color: 'rgba(240, 240, 240, 0.85)'}),
        text: `${distance} km at ${bearing}°`,
      }),
    }));
  }
  return styles;
};

export const travelStyle = (feature: Feature<LineString>) => {
  const geometry = feature.getGeometry()!;
  const styles = [
    // linestring
    new Style({
      stroke: new Stroke({
        color: '#ffcc33',
        width: 2,
      }),
    }),
  ];
  geometry.forEachSegment(function (start, end) {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const rotation = Math.atan2(dy, dx);
    // arrows
    styles.push(
      new Style({
        geometry: new Point([(end[0] + start[0]) / 2, (end[1] + start[1]) / 2]),
        image: new Icon({
          src: 'arrow.png',
          anchor: [0.75, 0.5],
          rotateWithView: true,
          rotation: -rotation,
        }),
      }),
    );
  });
  return styles;
}
