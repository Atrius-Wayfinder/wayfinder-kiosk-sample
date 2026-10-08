/**
 * TypeScript interfaces for the Airport Wayfinder Kiosk application
 */

/**
 * Geographic position with floor information
 */
export interface Position {
  lat: number;
  lng: number;
  floor: string;
}

/**
 * Point of Interest (POI) in the airport
 */
export interface POI {
  id: string;
  name: string;
  category: 'shop' | 'eat' | 'relax';
  description: string;
  position: Position;
  floor: string;
  distanceMeters?: number;
  imageUrl?: string;
  phone?: string;
  website?: string;
  hours?: string;
  amenities?: string[];
}

/**
 * User preferences and settings
 */
export interface UserPreferences {
  language: 'en' | 'es' | 'fr';
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
    /**
     * Reach mode: compresses the UI into the lower two-thirds of the screen so a
     * seated or wheelchair user can reach every control, and requests step-free
     * routes by default.
     */
    reachMode: boolean;
  };
  audioEnabled: boolean;
}

