import React, { useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { Market } from '../types';
import { MapPin, Navigation, Clock, Store } from 'lucide-react';

interface GoogleMarketMapProps {
  markets: Market[];
  selectedMarket?: Market | null;
  onSelectMarket?: (market: Market) => void;
  apiKey?: string;
}

export const GoogleMarketMap: React.FC<GoogleMarketMapProps> = ({
  markets,
  selectedMarket,
  onSelectMarket,
  apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyD9wuCN_WoDdrgWeNbCKzP3IvWgV1aQ4Ts',
}) => {
  const [activeMarket, setActiveMarket] = useState<Market | null>(selectedMarket || null);
  const [mapError, setMapError] = useState(false);

  // Default center around central Eket LGA
  const defaultCenter = { lat: 4.643, lng: 7.928 };
  const currentCenter = selectedMarket ? selectedMarket.coordinates : defaultCenter;

  const handleMarkerClick = (market: Market) => {
    setActiveMarket(market);
    if (onSelectMarket) onSelectMarket(market);
  };

  const openGoogleDirections = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  if (!apiKey || mapError) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-slate-800 dark:text-slate-200 transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-semibold text-lg text-slate-900 dark:text-white">Eket LGA Market Directory & Locations</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Interactive map view is currently in fallback mode. Browse market coordinates and addresses below:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {markets.map((m) => (
            <div
              key={m.id}
              onClick={() => onSelectMarket && onSelectMarket(m)}
              className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 p-4 rounded-xl hover:border-emerald-500/50 cursor-pointer transition shadow-xs"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-slate-900 dark:text-white">{m.name}</h4>
                <span className="text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  {m.code}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1 mb-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {m.address}
              </p>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                <span>{m.availableStalls} / {m.totalStalls} Stalls Open</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openGoogleDirections(m.coordinates.lat, m.coordinates.lng);
                  }}
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 font-medium"
                >
                  Directions <Navigation className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-slate-100 dark:bg-slate-950 transition-colors">
      <div className="h-[420px] w-full">
        <APIProvider apiKey={apiKey} onError={() => setMapError(true)}>
          <Map
            defaultCenter={currentCenter}
            defaultZoom={13}
            mapId="DEMO_MAP_ID"
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
            {markets.map((market) => (
              <AdvancedMarker
                key={market.id}
                position={market.coordinates}
                onClick={() => handleMarkerClick(market)}
                title={market.name}
              >
                <Pin
                  background={market.category === 'event' ? '#f59e0b' : '#059669'}
                  glyphColor="#ffffff"
                  borderColor="#064e3b"
                />
              </AdvancedMarker>
            ))}

            {activeMarket && (
              <InfoWindow
                position={activeMarket.coordinates}
                onCloseClick={() => setActiveMarket(null)}
              >
                <div className="p-2 text-slate-900 max-w-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {activeMarket.category}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">{activeMarket.code}</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 mb-1">{activeMarket.name}</h4>
                  <p className="text-xs text-slate-600 mb-2 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                    {activeMarket.address}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" /> {activeMarket.operatingHours}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-emerald-700">
                      <Store className="w-3 h-3" /> {activeMarket.availableStalls} open
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openGoogleDirections(activeMarket.coordinates.lat, activeMarket.coordinates.lng)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1.5 px-3 rounded-lg font-medium flex items-center justify-center gap-1 transition"
                    >
                      <Navigation className="w-3 h-3" /> Directions
                    </button>
                    {onSelectMarket && (
                      <button
                        type="button"
                        onClick={() => onSelectMarket(activeMarket)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs py-1.5 px-3 rounded-lg font-medium transition"
                      >
                        Browse Stalls
                      </button>
                    )}
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      </div>

      {/* Map control badges overlay */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2 pointer-events-none">
        <span className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full text-xs font-medium shadow-md">
          Eket LGA GIS Grounding
        </span>
        <span className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full text-xs font-medium shadow-md">
          {markets.length} Configured Market Centers
        </span>
      </div>
    </div>
  );
};
