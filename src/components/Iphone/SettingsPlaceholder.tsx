import { useState, useEffect } from 'react';
import { AboutPage, ContactPage, WallpaperPage, WallpaperPreview } from './SettingsPages';

type SettingsPage = 'main' | 'about' | 'contact' | 'wallpaper';

export function SettingsPlaceholder() {
  const [currentPage, setCurrentPage] = useState<SettingsPage>('main');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showNewTitle, setShowNewTitle] = useState(false);
  const [previewWallpaper, setPreviewWallpaper] = useState<string | null>(null);

  const handlePageChange = (page: SettingsPage) => {
    if (isAnimating || currentPage === page) return;
    setIsAnimating(true);
    setShowNewTitle(false);
    setCurrentPage(page);
    // Delay showing new title to ensure it starts off-screen
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setShowNewTitle(true);
      });
    });
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleBack = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setShowNewTitle(false);
    setCurrentPage('main');
    setPreviewWallpaper(null);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleWallpaperPreview = (wallpaper: string) => {
    setPreviewWallpaper(wallpaper);
  };

  const handlePreviewCancel = () => {
    setPreviewWallpaper(null);
  };

  const handlePreviewSet = () => {
    // TODO: Implement setting wallpaper
    setPreviewWallpaper(null);
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'about': return 'About';
      case 'contact': return 'Contact';
      case 'wallpaper': return 'Wallpaper';
      default: return 'Settings';
    }
  };

  return (
    <div className="iphone-settings">
      {/* Settings Top Bar */}
      <div className="iphone-settings-top-bar">
        {currentPage !== 'main' && (
          <button 
            className="iphone-settings-back-button"
            onClick={handleBack}
          >
            <div className="iphone-settings-back-arrow">
              <div className="iphone-settings-back-arrow-stem"></div>
              <div className="iphone-settings-back-arrow-head"></div>
            </div>
            <span className="iphone-settings-back-text">Settings</span>
          </button>
        )}
        <div className="iphone-settings-title-container">
          <h1 
            className={`iphone-settings-title ${currentPage !== 'main' ? 'iphone-settings-title-slide-out' : 'iphone-settings-title-active'}`}
          >
            Settings
          </h1>
          {currentPage !== 'main' && (
            <h1 
              className={`iphone-settings-title iphone-settings-title-new ${showNewTitle ? 'iphone-settings-title-slide-in' : ''}`}
            >
              {getPageTitle()}
            </h1>
          )}
        </div>
      </div>

      {/* Page Container */}
      <div className="iphone-settings-page-container">
        {/* Main Settings Page */}
        <div 
          className={`iphone-settings-main-page ${currentPage !== 'main' ? 'iphone-settings-page-slide-out' : 'iphone-settings-page-active'}`}
        >
          {/* Profile Section */}
          <div className="iphone-settings-profile">
            <img 
              src="/assets/settingsapp/profilepic.webp" 
              alt="Profile" 
              className="iphone-settings-profile-pic"
            />
            <div className="iphone-settings-profile-name">OCEANIC</div>
            <div className="iphone-settings-profile-email">booking@oceanicofficial.com</div>
          </div>

          {/* Settings Options */}
          <div className="iphone-settings-options">
            <button 
              className="iphone-settings-option iphone-settings-option-top"
              onClick={() => handlePageChange('about')}
            >
              About
              <span className="iphone-settings-option-chevron"></span>
            </button>
            <button 
              className="iphone-settings-option iphone-settings-option-middle"
              onClick={() => handlePageChange('contact')}
            >
              Contact
              <span className="iphone-settings-option-chevron"></span>
            </button>
            <button 
              className="iphone-settings-option iphone-settings-option-bottom"
              onClick={() => handlePageChange('wallpaper')}
            >
              Wallpaper
              <span className="iphone-settings-option-chevron"></span>
            </button>
          </div>
        </div>

        {/* About Page */}
        <div 
          className={`iphone-settings-sub-page ${currentPage === 'about' ? 'iphone-settings-page-active' : currentPage === 'main' ? 'iphone-settings-page-slide-in' : 'iphone-settings-page-hidden'}`}
        >
          <AboutPage />
        </div>

        {/* Contact Page */}
        <div 
          className={`iphone-settings-sub-page ${currentPage === 'contact' ? 'iphone-settings-page-active' : currentPage === 'main' ? 'iphone-settings-page-slide-in' : 'iphone-settings-page-hidden'}`}
        >
          <ContactPage />
        </div>

        {/* Wallpaper Page */}
        <div 
          className={`iphone-settings-sub-page ${currentPage === 'wallpaper' ? 'iphone-settings-page-active' : currentPage === 'main' ? 'iphone-settings-page-slide-in' : 'iphone-settings-page-hidden'}`}
        >
          <WallpaperPage onPreview={handleWallpaperPreview} />
        </div>
      </div>
      
      {/* Wallpaper Preview - rendered as direct child of .iphone-settings to layer above title */}
      {previewWallpaper && (
        <WallpaperPreview 
          wallpaper={previewWallpaper}
          onCancel={handlePreviewCancel}
          onSet={handlePreviewSet}
        />
      )}
    </div>
  );
}
