import { useState, useEffect } from 'react';
import { AboutPage, ContactPage, WallpaperPage, PhotoLibraryPage, CAMERA_ROLL_PHOTOS, PHOTO_LIBRARY_PHOTOS } from './PhotosPages';

type PhotosPage = 'main' | 'about' | 'contact' | 'wallpaper' | 'photoLibrary' | 'photoView';

export function PhotosPlaceholder() {
  const [currentPage, setCurrentPage] = useState<PhotosPage>('main');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showNewTitle, setShowNewTitle] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [photoViewSource, setPhotoViewSource] = useState<PhotosPage | null>(null);
  const [photoViewVisible, setPhotoViewVisible] = useState(false);
  const [isReturningFromPhotoView, setIsReturningFromPhotoView] = useState(false);

  const handlePageChange = (page: PhotosPage) => {
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

  const handlePhotoSelect = (index: number, sourcePage: PhotosPage) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSelectedPhotoIndex(index);
    setPhotoViewSource(sourcePage);
    setShowNewTitle(false);
    setPhotoViewVisible(false);
    // First set the page to photoView so the element is in the DOM
    setCurrentPage('photoView');
    // Then trigger the animation after a small delay to ensure DOM is ready
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPhotoViewVisible(true);
        setShowNewTitle(true);
      });
    });
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleBack = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setShowNewTitle(false);
    if (currentPage === 'photoView') {
      // Mark that we're returning from photoView
      setIsReturningFromPhotoView(true);
      // Change page immediately so the grid can start sliding back in
      setCurrentPage(photoViewSource || 'main');
      // Hide photo view so it slides out
      setPhotoViewVisible(false);
      // Trigger title animation after page change
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setShowNewTitle(true);
        });
      });
      // Clean up after animation completes
      setTimeout(() => {
        setSelectedPhotoIndex(null);
        setPhotoViewSource(null);
        setIsReturningFromPhotoView(false);
        setIsAnimating(false);
      }, 300);
    } else {
      setCurrentPage('main');
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const handlePhotoNavigate = (direction: 'prev' | 'next') => {
    if (isAnimating || selectedPhotoIndex === null || !photoViewSource) return;
    const photos = photoViewSource === 'wallpaper' ? CAMERA_ROLL_PHOTOS : PHOTO_LIBRARY_PHOTOS;
    const newIndex = direction === 'next' 
      ? (selectedPhotoIndex + 1) % photos.length
      : (selectedPhotoIndex - 1 + photos.length) % photos.length;
    setSelectedPhotoIndex(newIndex);
    setShowNewTitle(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setShowNewTitle(true);
      });
    });
  };

  const getPageTitle = () => {
    if (currentPage === 'photoView' && selectedPhotoIndex !== null && photoViewSource) {
      const photos = photoViewSource === 'wallpaper' ? CAMERA_ROLL_PHOTOS : PHOTO_LIBRARY_PHOTOS;
      return `${selectedPhotoIndex + 1} of ${photos.length}`;
    }
    switch (currentPage) {
      case 'about': return 'About';
      case 'contact': return 'Contact';
      case 'wallpaper': return 'Camera Roll';
      case 'photoLibrary': return 'Photo Library';
      default: return 'Photo Albums';
    }
  };

  const getBackButtonText = () => {
    if (currentPage === 'photoView') {
      return photoViewSource === 'wallpaper' ? 'Camera Roll' : 'Photo Library';
    }
    return 'Photo Album';
  };

  return (
    <div className="iphone-photos">
      {/* Photos Top Bar */}
      <div className={`iphone-photos-top-bar ${currentPage !== 'main' ? 'iphone-photos-top-bar-with-back' : ''} ${currentPage === 'photoView' ? 'iphone-photos-top-bar-photo-view' : ''}`}>
        {currentPage !== 'main' && (
          <button 
            className="iphone-photos-back-button"
            onClick={handleBack}
          >
            <div className="iphone-photos-back-arrow">
              <div className="iphone-photos-back-arrow-stem"></div>
              <div className="iphone-photos-back-arrow-head"></div>
            </div>
            <span className="iphone-photos-back-text">{getBackButtonText()}</span>
          </button>
        )}
        <div className="iphone-photos-title-container">
          {currentPage === 'photoView' ? (
            <>
              <h1 
                className={`iphone-photos-title ${photoViewSource === 'wallpaper' ? 'Camera Roll' : 'Photo Library'} ${'iphone-photos-title-slide-out'}`}
              >
                {photoViewSource === 'wallpaper' ? 'Camera Roll' : 'Photo Library'}
              </h1>
              <h1 
                className={`iphone-photos-title iphone-photos-title-new ${showNewTitle ? 'iphone-photos-title-slide-in' : ''}`}
              >
                {getPageTitle()}
              </h1>
            </>
          ) : (
            <>
              <h1 
                className={`iphone-photos-title ${currentPage !== 'main' ? 'iphone-photos-title-slide-out' : 'iphone-photos-title-active'}`}
              >
                Photo Albums
              </h1>
              {currentPage !== 'main' && (
                <h1 
                  className={`iphone-photos-title ${isReturningFromPhotoView ? 'iphone-photos-title-new-left' : 'iphone-photos-title-new'} ${showNewTitle ? 'iphone-photos-title-slide-in' : ''}`}
                >
                  {getPageTitle()}
                </h1>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="iphone-photos-content">
        {/* Page Container */}
        <div className="iphone-photos-page-container">
          {/* Main Photos Page */}
          <div 
            className={`iphone-photos-main-page ${currentPage !== 'main' ? 'iphone-photos-page-slide-out' : 'iphone-photos-page-active'}`}
          >
            <div className="iphone-photos-list">
              <button 
                className="iphone-photos-item"
                onClick={() => handlePageChange('wallpaper')}
              >
                <img 
                  src="/assets/photosapp/cameraroll/WayOut-Photos-1.webp" 
                  alt="" 
                  className="iphone-photos-item-icon"
                />
                <span className="iphone-photos-item-text">Camera Roll <span className="iphone-photos-item-count">({CAMERA_ROLL_PHOTOS.length})</span></span>
                <span className="iphone-photos-item-chevron"></span>
              </button>
              <button 
                className="iphone-photos-item"
                onClick={() => handlePageChange('photoLibrary')}
              >
                <img 
                  src="/assets/photosapp/photoalbumicon.webp" 
                  alt="" 
                  className="iphone-photos-item-icon"
                />
                <span className="iphone-photos-item-text">Photo Library <span className="iphone-photos-item-count">({PHOTO_LIBRARY_PHOTOS.length})</span></span>
                <span className="iphone-photos-item-chevron"></span>
              </button>
              <button 
                className="iphone-photos-item iphone-photos-item-empty"
                disabled
              >
                <span className="iphone-photos-item-text"></span>
              </button>
              <button 
                className="iphone-photos-item iphone-photos-item-empty"
                disabled
              >
                <span className="iphone-photos-item-text"></span>
              </button>
              <button 
                className="iphone-photos-item iphone-photos-item-empty"
                disabled
              >
                <span className="iphone-photos-item-text"></span>
              </button>
              <button 
                className="iphone-photos-item iphone-photos-item-empty"
                disabled
              >
                <span className="iphone-photos-item-text"></span>
              </button>
              <button 
                className="iphone-photos-item iphone-photos-item-empty"
                disabled
              >
                <span className="iphone-photos-item-text"></span>
              </button>
              <button 
                className="iphone-photos-item iphone-photos-item-empty"
                disabled
              >
                <span className="iphone-photos-item-text"></span>
              </button>
              <button 
                className="iphone-photos-item iphone-photos-item-empty"
                disabled
              >
                <span className="iphone-photos-item-text"></span>
              </button>
            </div>
          </div>

          {/* About Page */}
          <div 
            className={`iphone-photos-sub-page ${currentPage === 'about' ? 'iphone-photos-page-active' : currentPage === 'main' ? 'iphone-photos-page-slide-in' : 'iphone-photos-page-hidden'}`}
          >
            <AboutPage />
          </div>

          {/* Contact Page */}
          <div 
            className={`iphone-photos-sub-page ${currentPage === 'contact' ? 'iphone-photos-page-active' : currentPage === 'main' ? 'iphone-photos-page-slide-in' : 'iphone-photos-page-hidden'}`}
          >
            <ContactPage />
          </div>

          {/* Wallpaper Page */}
          <div 
            className={`iphone-photos-sub-page ${currentPage === 'wallpaper' ? 'iphone-photos-page-active' : currentPage === 'main' ? 'iphone-photos-page-slide-in' : currentPage === 'photoView' ? 'iphone-photos-page-slide-out-left' : 'iphone-photos-page-hidden'}`}
          >
            <WallpaperPage onPhotoSelect={(index) => handlePhotoSelect(index, 'wallpaper')} />
          </div>

          {/* Photo Library Page */}
          <div 
            className={`iphone-photos-sub-page ${currentPage === 'photoLibrary' ? 'iphone-photos-page-active' : currentPage === 'main' ? 'iphone-photos-page-slide-in' : currentPage === 'photoView' ? 'iphone-photos-page-slide-out-left' : 'iphone-photos-page-hidden'}`}
          >
            <PhotoLibraryPage onPhotoSelect={(index) => handlePhotoSelect(index, 'photoLibrary')} />
          </div>
        </div>
      </div>

      {/* Photo View Page - positioned relative to main container to extend behind title bar */}
      {selectedPhotoIndex !== null && photoViewSource && (
        <div 
          className={`iphone-photos-photo-view ${photoViewVisible && currentPage === 'photoView' ? 'iphone-photos-photo-view-active' : 'iphone-photos-photo-view-hidden'}`}
          style={{ backgroundImage: `url(${photoViewSource === 'wallpaper' ? CAMERA_ROLL_PHOTOS[selectedPhotoIndex] : PHOTO_LIBRARY_PHOTOS[selectedPhotoIndex]})` }}
        >
          {/* Bottom Navigation Bar - inside photo view */}
          {currentPage === 'photoView' && (
            <div className="iphone-photos-bottom-bar">
              <button 
                className="iphone-photos-nav-button iphone-photos-nav-button-left"
                onClick={() => handlePhotoNavigate('prev')}
              >
                <div className="iphone-photos-nav-arrow iphone-photos-nav-arrow-left">
                  <div className="iphone-photos-nav-arrow-head"></div>
                  <div className="iphone-photos-nav-arrow-stem"></div>
                </div>
              </button>
              <div className="iphone-photos-bottom-bar-spacer"></div>
              <button 
                className="iphone-photos-nav-button iphone-photos-nav-button-right"
                onClick={() => handlePhotoNavigate('next')}
              >
                <div className="iphone-photos-nav-arrow iphone-photos-nav-arrow-right">
                  <div className="iphone-photos-nav-arrow-stem"></div>
                  <div className="iphone-photos-nav-arrow-head"></div>
                </div>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
