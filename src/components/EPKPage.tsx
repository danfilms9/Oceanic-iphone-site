import { useState } from 'react'
import './EPKPage.css'

export function EPKPage() {
  const [embedLoaded, setEmbedLoaded] = useState(false)

  return (
    <div className="epk-container">
      {!embedLoaded && (
        <div className="epk-loading" aria-hidden={embedLoaded}>
          <div className="epk-loading-spinner" />
          <span className="epk-loading-text">Loading...</span>
        </div>
      )}
      <iframe
        src="https://my.spline.design/oceanicepk-cf85e29646ce94f653e75d4c042997bd/"
        frameBorder="0"
        width="100%"
        height="100%"
        title="EPK Spline"
        onLoad={() => setEmbedLoaded(true)}
      />
    </div>
  )
}
