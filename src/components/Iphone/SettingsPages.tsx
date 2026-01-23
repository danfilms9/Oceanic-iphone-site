import { useState, useEffect } from 'react';
import { useWallpaper } from './WallpaperContext';
import { fetchAboutInfoFromNotion, type GroupedAboutInfo } from '../../services/aboutService';
import { fetchContactInfoFromNotion, type ContactInfo } from '../../services/contactService';

const WALLPAPERS = Array.from({ length: 12 }, (_, i) => `/assets/wallpapers/Wallpaper${i + 1}.webp`);

export function AboutPage() {
  const [groupedEntries, setGroupedEntries] = useState<GroupedAboutInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAboutInfo = async () => {
      setIsLoading(true);
      try {
        const groups = await fetchAboutInfoFromNotion();
        setGroupedEntries(groups);
      } catch (error) {
        console.error('Error loading about info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAboutInfo();
  }, []);

  // Determine CSS classes based on position in the list within a group
  const getRowClasses = (index: number, total: number) => {
    let classes = 'iphone-settings-option iphone-mail-form-field';
    
    if (total === 1) {
      // Single item - rounded on all corners
      classes += ' iphone-settings-option-top iphone-settings-option-bottom-three';
    } else if (index === 0) {
      // First item - rounded top
      classes += ' iphone-settings-option-top';
    } else if (index === total - 1) {
      // Last item - rounded bottom
      classes += ' iphone-settings-option-bottom-three';
    } else {
      // Middle items - no rounding
      classes += ' iphone-settings-option-middle-three';
    }
    
    return classes;
  };

  return (
    <div className="iphone-settings-page">
      <div className="iphone-mail-form">
        {isLoading ? (
          <div className="iphone-settings-options iphone-mail-form-container">
            <div className="iphone-mail-form-divider"></div>
            <div className="iphone-settings-option iphone-settings-option-top iphone-mail-form-field">
              <span className="iphone-mail-form-label">Loading...</span>
            </div>
          </div>
        ) : groupedEntries.length === 0 ? (
          <div className="iphone-settings-options iphone-mail-form-container">
            <div className="iphone-mail-form-divider"></div>
            <div className="iphone-settings-option iphone-settings-option-top iphone-mail-form-field">
              <span className="iphone-mail-form-label">No entries found</span>
            </div>
          </div>
        ) : (
          groupedEntries.map((group, groupIndex) => (
            <div 
              key={group.group} 
              className="iphone-settings-options iphone-mail-form-container"
              style={groupIndex > 0 ? { marginTop: '45px' } : undefined}
            >
              <div className="iphone-mail-form-divider"></div>
              {group.entries.map((entry, entryIndex) => (
                <div 
                  key={entry.title + entry.info} 
                  className={getRowClasses(entryIndex, group.entries.length)}
                  style={group.entries.length === 1 ? { borderRadius: '18px' } : undefined}
                >
                  <span className="iphone-mail-form-label">{entry.title}</span>
                  <span className="iphone-mail-form-input">{entry.info}</span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function ContactPage() {
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadContactInfo = async () => {
      setIsLoading(true);
      try {
        const contactList = await fetchContactInfoFromNotion();
        setContacts(contactList);
      } catch (error) {
        console.error('Error loading contact info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContactInfo();
  }, []);

  // Determine CSS classes based on position in the list
  const getRowClasses = (index: number, total: number) => {
    let classes = 'iphone-settings-option iphone-mail-form-field';
    
    if (total === 1) {
      // Single item - rounded on all corners (use both top and bottom classes)
      classes += ' iphone-settings-option-top iphone-settings-option-bottom-three';
    } else if (index === 0) {
      // First item - rounded top
      classes += ' iphone-settings-option-top';
    } else if (index === total - 1) {
      // Last item - rounded bottom
      classes += ' iphone-settings-option-bottom-three';
    } else {
      // Middle items - no rounding
      classes += ' iphone-settings-option-middle-three';
    }
    
    return classes;
  };

  return (
    <div className="iphone-settings-page">
      <div className="iphone-mail-form">
        {/* Form Fields */}
        <div className="iphone-settings-options iphone-mail-form-container">
          <div className="iphone-mail-form-divider"></div>
          {isLoading ? (
            <div className="iphone-settings-option iphone-settings-option-top iphone-mail-form-field">
              <span className="iphone-mail-form-label">Loading...</span>
            </div>
          ) : contacts.length === 0 ? (
            <div className="iphone-settings-option iphone-settings-option-top iphone-mail-form-field">
              <span className="iphone-mail-form-label">No contacts found</span>
            </div>
          ) : (
            contacts.map((contact, index) => (
              <div 
                key={contact.name + contact.email} 
                className={getRowClasses(index, contacts.length)}
                style={contacts.length === 1 ? { borderRadius: '18px' } : undefined}
              >
                <span className="iphone-mail-form-label">{contact.name}</span>
                <span className="iphone-mail-form-input">{contact.email}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface WallpaperPageProps {
  onPreview?: (wallpaper: string) => void;
}

export function WallpaperPage({ onPreview }: WallpaperPageProps) {
  return (
    <div className="iphone-settings-page">
      <div className="iphone-wallpaper-grid">
        {WALLPAPERS.map((wallpaper, index) => (
          <button
            key={index}
            className="iphone-wallpaper-thumbnail"
            onClick={() => onPreview?.(wallpaper)}
          >
            <img src={wallpaper} alt={`Wallpaper ${index + 1}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function WallpaperPreview({ 
  wallpaper, 
  onCancel, 
  onSet 
}: { 
  wallpaper: string; 
  onCancel: () => void; 
  onSet: () => void;
}) {
  const { setWallpaper } = useWallpaper();
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Delay adding visible class to ensure animation plays
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
  }, []);

  const handleCancel = () => {
    setIsClosing(true);
    setTimeout(() => {
      onCancel();
    }, 600);
  };

  const handleSet = () => {
    setWallpaper(wallpaper);
    setIsClosing(true);
    setTimeout(() => {
      onSet();
    }, 600);
  };

  return (
    <div className={`iphone-wallpaper-preview ${isClosing ? 'iphone-wallpaper-preview-closing' : isVisible ? 'iphone-wallpaper-preview-visible' : ''}`}>
      <div className="iphone-wallpaper-preview-image-container">
        <img 
          src={wallpaper} 
          alt="Preview" 
          className="iphone-wallpaper-preview-image"
        />
      </div>
      
      {/* Top Bar */}
      <div className="iphone-wallpaper-preview-top-bar">
        <div className="iphone-wallpaper-preview-top-bar-bg"></div>
        <div className="iphone-wallpaper-preview-text">Wallpaper Preview</div>
      </div>

      {/* Bottom Bar with Buttons */}
      <div className="iphone-wallpaper-preview-bottom-bar">
        <div className="iphone-wallpaper-preview-bottom-bar-bg"></div>
            <div className="iphone-wallpaper-preview-buttons">
              <div className="iphone-wallpaper-preview-button-wrapper">
                <button 
                  className="iphone-wallpaper-preview-button iphone-wallpaper-preview-button-cancel"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </div>
              <div className="iphone-wallpaper-preview-button-wrapper">
                <button 
                  className="iphone-wallpaper-preview-button iphone-wallpaper-preview-button-set"
                  onClick={handleSet}
                >
                  Set
                </button>
              </div>
            </div>
      </div>
    </div>
  );
}
