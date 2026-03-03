/**
 * GateFinder View Component
 *
 * Allows passengers to find their gate by entering their flight number.
 * Displays route information and initiates navigation to the gate.
 */

import { useState } from 'react';
import { useKioskStore } from '@/store/kioskStore';
import { gateFinderService } from '@/services';
import type { POI } from '@/types/wayfinder';
import type { SDKPOI } from '@/types/wayfinder-sdk';

export function GateFinder() {
  // Store state
  const selectPOI = useKioskStore((state) => state.selectPOI);
  const setNavigating = useKioskStore((state) => state.setNavigating);
  const setErrorMessage = useKioskStore((state) => state.setErrorMessage);
  const updateInteraction = useKioskStore((state) => state.updateInteraction);
  const reset = useKioskStore((state) => state.reset);

  // Component state
  const [flightNumber, setFlightNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [gatePOI, setGatePOI] = useState<SDKPOI | null>(null);
  const [walkingTime, setWalkingTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle flight number search
   */
  const handleFlightSearch = async () => {
    updateInteraction();
    if (!flightNumber.trim()) {
      setError('Please enter a flight number');
      return;
    }

    const parsedFlightNumber = gateFinderService.parseFlightNumber(flightNumber);
    if (!parsedFlightNumber) {
      setError('Invalid flight number format. Please use format like AA123 or American 123.');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const gate = await gateFinderService.findGateByFlightNumber(parsedFlightNumber);
      if (gate) {
        await displayGateInfo(gate);
      } else {
        setError(`Gate for flight ${parsedFlightNumber} not found. Please check the flight information displays or ask an agent.`);
      }
    } catch (err) {
      console.error('Error finding gate by flight number:', err);
      setError('Unable to find gate. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Display gate information and calculate route
   */
  const displayGateInfo = async (gate: SDKPOI) => {
    setGatePOI(gate);

    try {
      // Use blessed ID property from SDK (never fall back to user-facing name)
      const gateId = gate.id || gate.poiId;
      if (!gateId) {
        console.error('Gate POI missing stable ID:', gate);
        setError('Gate data is incomplete. Please try again or ask an agent.');
        return;
      }

      const route = await gateFinderService.getRouteToGate(gateId);
      const timeSeconds = route.eta || 0;
      setWalkingTime(gateFinderService.formatWalkingTime(timeSeconds));
    } catch (err) {
      console.error('Error calculating route:', err);
      setWalkingTime(null);
    }
  };

  /**
   * Navigate to gate on map
   */
  const navigateToGate = async () => {
    updateInteraction();
    if (!gatePOI) {
      return;
    }

    try {
      // Use blessed ID property from SDK (never fall back to user-facing name)
      const gateId = gatePOI.id || gatePOI.poiId;
      if (!gateId) {
        console.error('Gate POI missing stable ID:', gatePOI);
        setErrorMessage('Gate data is incomplete. Please try again or ask an agent.');
        setError('Gate data is incomplete. Please try again or ask an agent.');
        return;
      }

      const poi: POI = {
        id: gateId,
        name: gatePOI.name,
        category: 'relax',
        description: gatePOI.description || '',
        position: {
          lat: gatePOI.position.latitude,
          lng: gatePOI.position.longitude,
          floor: gatePOI.position.floorId,
        },
        floor: gatePOI.position.floorId,
      };

      selectPOI(poi);
      setNavigating(true);

      await gateFinderService.showNavigationToGate(gateId);
    } catch (err) {
      console.error('Error starting navigation:', err);
      setErrorMessage('Unable to start navigation. Please try again.');
      setError('Unable to start navigation. Please try again.');
    }
  };

  /**
   * Reset to initial state
   */
  const resetSearch = () => {
    updateInteraction();
    setGatePOI(null);
    setWalkingTime(null);
    setError(null);
    setFlightNumber('');
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-md p-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={() => {
              updateInteraction();
              reset();
            }}
            className="flex items-center gap-3 text-blue-600 hover:text-blue-700 transition-colors text-xl font-medium"
            aria-label="Back to home"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>Back</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Find Your Gate</h1>
          <div className="w-24" aria-hidden="true" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Error Display */}
          {error && (
            <div
              className="bg-red-50 border-2 border-red-500 rounded-lg p-6 text-center"
              role="alert"
              aria-live="polite"
            >
              <p className="text-xl text-red-800 font-medium">{error}</p>
              <button
                onClick={resetSearch}
                className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-lg font-medium"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Results Display */}
          {gatePOI && !error && (
            <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
              <div className="text-center border-b pb-6">
                <h2 className="text-4xl font-bold text-green-600 mb-2">Gate Found!</h2>
              </div>

              <div className="text-center space-y-4">
                <div>
                  <p className="text-2xl text-gray-600 mb-2">Your Gate</p>
                  <p className="text-6xl font-bold text-blue-600">{gatePOI.name}</p>
                </div>

                {walkingTime && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-xl text-gray-700">
                      <span className="font-semibold">Walking Time:</span> {walkingTime}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={navigateToGate}
                className="w-full min-h-[80px] bg-blue-600 text-white text-2xl font-bold rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-lg"
                aria-label={`Navigate to ${gatePOI.name}`}
              >
                Navigate to Gate
              </button>

              <button
                onClick={resetSearch}
                className="w-full min-h-[60px] bg-gray-200 text-gray-800 text-xl font-medium rounded-lg hover:bg-gray-300 active:bg-gray-400 transition-colors"
                aria-label="Search for another gate"
              >
                Search Another Gate
              </button>
            </div>
          )}

          {/* Flight Number Entry Section */}
          {!gatePOI && (
            <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Enter Flight Number
                </h2>
                <p className="text-lg text-gray-600">
                  Example: AA123, Delta 456, or UA789
                </p>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  value={flightNumber}
                  onChange={(e) => {
                    setFlightNumber(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  placeholder="Enter flight number"
                  disabled={isSearching}
                  className="w-full text-2xl p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  aria-label="Flight number input"
                  maxLength={10}
                />

                <button
                  onClick={handleFlightSearch}
                  disabled={isSearching || !flightNumber.trim()}
                  className="w-full min-h-[70px] bg-blue-600 text-white text-2xl font-bold rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg"
                  aria-label="Search for gate by flight number"
                >
                  {isSearching ? 'Searching...' : 'Search Gate'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default GateFinder;