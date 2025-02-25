import type { Extent } from "ol/extent";
import type Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import type Point from "ol/geom/Point";
import { all } from "ol/loadingstrategy";
import type Projection from "ol/proj/Projection";
import Vector from "ol/source/Vector";

export class SessionStorageSource extends Vector<Feature<Point>> {
  constructor({key}: {key: string}) {
    const format = new GeoJSON<Feature<Point>>();
    const loader = (extent: Extent, resolution: number, projection: Projection, success: any, failure: any) => {
      const data = sessionStorage.getItem(key);
      if (data)
        this.addFeatures(format.readFeatures(data));
      return success && success();
    };

    super({
      format,
      loader,
      strategy: all,
    });

    this.on('change', () => {
      const data = format.writeFeatures(this.getFeatures())
      sessionStorage.setItem(key, data);
    });
  }
}
