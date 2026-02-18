import type { ComponentType } from 'react';
import { NotesPlaceholder } from '../components/Iphone/NotesPlaceholder';
import { CalendarPlaceholder } from '../components/Iphone/CalendarPlaceholder';
import { MerchPlaceholder } from '../components/Iphone/MerchPlaceholder';
import { MailPlaceholder } from '../components/Iphone/MailPlaceholder';
import { PhotosPlaceholder } from '../components/Iphone/PhotosPlaceholder';
import { CareMorePlaceholder } from '../components/Iphone/CareMorePlaceholder';
import { YoutubePlaceholder } from '../components/Iphone/YoutubePlaceholder';
import { SettingsPlaceholder } from '../components/Iphone/SettingsPlaceholder';
import { MusicPlaceholder } from '../components/Iphone/MusicPlaceholder';
import { VisualizerApp } from '../components/VisualizerApp';

/**
 * App definitions for the iPhone home screen.
 * Swap icons by replacing the .webp files in /public/assets/apps/
 */
export interface AppDef {
  id: string;
  label: string;
  iconPath: string;
  component: ComponentType;
}

export const APP_REGISTRY: AppDef[] = [
  { id: 'mail', label: 'E-mail List', iconPath: '/assets/apps/Mail.webp', component: MailPlaceholder },
  { id: 'calendar', label: 'Tour Dates', iconPath: '/assets/apps/Calendar.webp', component: CalendarPlaceholder },
  { id: 'merch', label: 'Merch', iconPath: '/assets/icons/Merch.webp', component: MerchPlaceholder },
  { id: 'photos', label: 'Photos', iconPath: '/assets/apps/Photos.webp', component: PhotosPlaceholder },
  { id: 'caremore', label: 'CM Game', iconPath: '/assets/icons/CareMore.webp', component: CareMorePlaceholder },
  { id: 'youtube', label: 'YouTube', iconPath: '/assets/apps/Youtube.webp', component: YoutubePlaceholder },
  { id: 'notes', label: 'Notes', iconPath: '/assets/apps/Notes.webp', component: NotesPlaceholder },
  { id: 'music', label: 'Music', iconPath: '/assets/apps/Music.webp', component: MusicPlaceholder },
  { id: 'settings', label: 'Settings', iconPath: '/assets/apps/Settings.webp', component: SettingsPlaceholder },
  { id: 'visualizer', label: 'Visualizer', iconPath: '/assets/apps/Music.webp', component: VisualizerApp },
];

export function getApp(id: string): AppDef | undefined {
  return APP_REGISTRY.find((a) => a.id === id);
}

/** App ids that appear in the dock, in order. */
export const DOCK_APP_IDS = ['calendar', 'merch'] as const;

export function getDockApps(): AppDef[] {
  return DOCK_APP_IDS.map((id) => getApp(id)).filter((a): a is AppDef => a != null);
}
