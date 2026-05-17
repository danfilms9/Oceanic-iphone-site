import { FanMap } from '../FanMap/FanMap.jsx'

/** Maps — same top bar as Music; globe fills the area below (no music tab bar). */
export function MapsPlaceholder() {
  return (
    <div className="iphone-music iphone-music--maps">
      <div className="iphone-music-top-bar">
        <div className="iphone-music-title-container">
          <h1 className="iphone-music-title iphone-music-title-active">Maps</h1>
        </div>
      </div>
      <div className="iphone-music-content iphone-music-content--maps">
        <FanMap layout="music" />
      </div>
    </div>
  )
}
