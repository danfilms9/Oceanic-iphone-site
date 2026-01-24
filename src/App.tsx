import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { IphoneShell } from './components/Iphone/IphoneShell'
import { EPKPage } from './components/EPKPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/epk" element={<EPKPage />} />
        <Route path="*" element={<IphoneShell />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
