import { Feature } from "ol";
import { Vector } from "ol/source";
import { ObservationProperties } from "../observation";
import { LineString } from "ol/geom";
import { getDistance } from "ol/sphere";
import { species } from "../Taxon";

export class Travel extends Vector {
  constructor({sources}: {sources: Vector[]}) {
    super();

    const redrawLines = () => {
      this.clear();
      const observations = sources.
        flatMap(src => src.getFeatures()).
        sort((a, b) => a.get('observedAt').since(b.get('observedAt')).sign);
      for (const obs of observations) {
        const {coordinates: obsCoordinates, observedAt: obsObservedAt, taxon: obsTaxon} = obs.getProperties() as ObservationProperties;

        for (const candidate of observations) {
          const {coordinates: candidateCoordinates, observedAt: candidateObservedAt, taxon: candidateTaxon} = candidate.getProperties() as ObservationProperties;
          if (species(obsTaxon) !== species(candidateTaxon))
            continue;

          const timeDelta = candidateObservedAt.since(obsObservedAt);
          // candidate must be later
          if (timeDelta.sign <= 0)
            continue;

          if(timeDelta.total('hours') > 12)
            continue;

          const displacementMeters = getDistance(obsCoordinates, candidateCoordinates);
          if (displacementMeters > 10000)
            continue;

          const metersPerHour = displacementMeters / timeDelta.total('hours');
          // Maximum speed for SKRWs and Biggs is 6-7 km/h, but we should allow for some uncertainty in the data.
          if (metersPerHour > 10000)
            continue;

          const feature = new Feature();
          const line = new LineString([obsCoordinates, candidateCoordinates]);
          feature.setGeometry(line);
          this.addFeature(feature);
          break;
        }
      }
    }

    for (const source of sources) {
      source.on('featuresloadend', () => {
        setTimeout(redrawLines, 30);
      });
    }
  }
}
