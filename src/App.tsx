import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { IphoneShell } from './components/Iphone/IphoneShell'
import { EPKPage } from './components/EPKPage'
import { SmsTermsPage } from './components/legal/SmsTermsPage'
import { PrivacyPolicyPage } from './components/legal/PrivacyPolicyPage'
import { SMS_TERMS_PATH, PRIVACY_POLICY_PATH } from './lib/smsConsent'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/epk" element={<EPKPage />} />
        <Route path={SMS_TERMS_PATH} element={<SmsTermsPage />} />
        <Route path={PRIVACY_POLICY_PATH} element={<PrivacyPolicyPage />} />
        <Route path="*" element={<IphoneShell />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
