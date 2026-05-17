import countriesTopology from 'world-atlas/countries-110m.json'
import { feature } from 'topojson-client'

let memoizedPolygonsData = null

/** Countries from Natural Earth 110m TopoJSON, converted once and cached. */
export function getCountriesPolygonsData() {
  if (!memoizedPolygonsData) {
    const geo = feature(countriesTopology, countriesTopology.objects.countries)
    memoizedPolygonsData = geo.features
  }
  return memoizedPolygonsData
}
