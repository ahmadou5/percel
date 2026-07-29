'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  ArrowUpDown,
  Bike,
  Truck,
  Globe,
  Search,
  ChevronRight,
  Navigation,
} from 'lucide-react';

export function PhoneMockup() {
  const [activeTab, setActiveTab] = useState<'WITHIN_STATE' | 'INTERSTATE'>('WITHIN_STATE');
  const [selectedVehicle, setSelectedVehicle] = useState<'BIKE' | 'KEKE'>('BIKE');
  const [showHubModal, setShowHubModal] = useState(false);
  const [originHub, setOriginHub] = useState('Mariri Hub, Kano');
  const [destHub, setDestHub] = useState('Jabi Hub, Abuja');

  const hubs = [
    { city: 'ABUJA', name: 'Jabi', type: 'Partner park', address: 'Abuja, Abuja • Hausawa Dan Fulani' },
    { city: 'KANO', name: 'Mariri', type: 'Agent', address: 'Kano, Kano • Hausawa Dan Fulani' },
    { city: 'KANO', name: 'IBB', type: 'Agent', address: 'Kano, Kano • Hausawa Dan Fulani' },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[300px]">
      {/* Dynamic Glow Backdrop adapting to primary theme color */}
      <div className="absolute -inset-4 rounded-[48px] bg-gradient-to-tr from-primary/30 via-accent/20 to-primary/20 blur-2xl opacity-60 animate-pulse-ring" />

      {/* Device Outer Frame */}
      <div className="relative overflow-hidden rounded-[42px] border-[5px] border-border/90 bg-card p-2 shadow-2xl">
        {/* Screen Notch */}
        <div className="absolute top-0 left-1/2 z-30 h-4.5 w-28 -translate-x-1/2 rounded-b-2xl bg-card border-b border-border flex items-center justify-center">
          <div className="h-1.5 w-8 rounded-full bg-border" />
        </div>

        {/* Device Screen Inner - Adapts to Theme Background */}
        <div className="relative flex flex-col h-[560px] rounded-[34px] bg-card text-foreground pt-6 overflow-hidden border border-border/80">
          
          {/* Styled Dark Map Canvas Background */}
          <div className="absolute inset-0 z-0 bg-background/95 overflow-hidden">
            {/* Real Map Road Vector Patterns */}
            <svg className="absolute inset-0 h-full w-full opacity-35" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-border" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#map-grid)" />
              {/* Expressway Road Lines */}
              <path d="M -20 180 Q 140 220 320 160" fill="none" stroke="currentColor" strokeWidth="6" className="text-border/80" />
              <path d="M 80 -10 Q 120 280 200 600" fill="none" stroke="currentColor" strokeWidth="5" className="text-border/80" />
              <path d="M 140 100 Q 220 300 290 520" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="6 4" className="text-primary animate-pulse" />
              {/* City Labels */}
              <text x="35" y="150" fill="currentColor" fontSize="9" fontWeight="bold" className="text-muted-foreground">KANO</text>
              <text x="170" y="320" fill="currentColor" fontSize="9" fontWeight="bold" className="text-muted-foreground">KADUNA</text>
              <text x="180" y="470" fill="currentColor" fontSize="9" fontWeight="bold" className="text-muted-foreground">ABUJA</text>
            </svg>

            {/* Map Markers */}
            <div className="absolute top-[130px] left-[60px] z-10 flex items-center gap-1 bg-card/90 border border-emerald-500/50 px-2 py-0.5 rounded-full shadow-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[8px] font-bold text-emerald-400">Zoo Road</span>
            </div>

            <div className="absolute top-[440px] left-[150px] z-10 flex items-center gap-1 bg-card/90 border border-primary/50 px-2 py-0.5 rounded-full shadow-md">
              <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
              <span className="text-[8px] font-bold text-primary">CBD Abuja</span>
            </div>

            {/* Route ETA Badge Pill */}
            <div className="absolute top-[270px] left-1/2 z-10 -translate-x-1/2 flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-extrabold text-white shadow-xl shadow-primary/40 border border-white/20">
              <Navigation className="h-3 w-3 fill-white" />
              <span>686 min</span>
            </div>
          </div>

          {/* Foreground UI Overlay */}
          <div className="relative z-10 flex flex-col h-full p-3 space-y-2.5">

            {/* Top Toggle Bar */}
            <div className="rounded-2xl bg-card/95 p-1 backdrop-blur-xl border border-border/80 shadow-lg">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('WITHIN_STATE')}
                  className={`flex items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-bold transition-all ${
                    activeTab === 'WITHIN_STATE'
                      ? 'bg-primary text-white shadow-md'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <MapPin className="h-3 w-3" />
                  <span>Within State</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('INTERSTATE')}
                  className={`flex items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-bold transition-all ${
                    activeTab === 'INTERSTATE'
                      ? 'bg-primary text-white shadow-md'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Globe className="h-3 w-3" />
                  <span>Interstate</span>
                </button>
              </div>
            </div>

            {/* Pickup & Delivery Location Box */}
            <div className="rounded-2xl border border-border/80 bg-card/95 p-2.5 space-y-1.5 backdrop-blur-xl shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-2">
                  <div className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 mt-0.5">
                    <MapPin className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Pickup Location</p>
                    <p className="text-[11px] font-extrabold text-foreground">Zoo Road</p>
                    <p className="text-[9px] text-muted-foreground">Kano</p>
                  </div>
                </div>
              </div>

              {/* Center Swap Divider Line */}
              <div className="relative flex items-center justify-center my-0.5">
                <div className="w-full border-t border-border/80" />
                <button
                  type="button"
                  className="absolute grid h-5 w-5 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm"
                >
                  <ArrowUpDown className="h-2.5 w-2.5" />
                </button>
              </div>

              <div className="flex items-start gap-2">
                <div className="grid h-5 w-5 place-items-center rounded-full bg-primary/20 text-primary mt-0.5">
                  <MapPin className="h-3 w-3" />
                </div>
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Delivery Address</p>
                  <p className="text-[11px] font-extrabold text-foreground">Central Business District</p>
                  <p className="text-[9px] text-muted-foreground">Abuja</p>
                </div>
              </div>
            </div>

            {/* Bottom Sheet Section */}
            <div className="mt-auto space-y-2">
              {activeTab === 'WITHIN_STATE' ? (
                /* Local Vehicle Option Section */
                <div className="rounded-3xl border border-border/80 bg-card/95 p-2.5 space-y-2 backdrop-blur-2xl shadow-2xl">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                    Select Local Vehicle
                  </p>

                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Bike Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedVehicle('BIKE')}
                      className={`relative flex flex-col justify-between rounded-2xl border p-2 text-left transition-all ${
                        selectedVehicle === 'BIKE'
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                          : 'border-border bg-background/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="grid h-6 w-6 place-items-center rounded-lg bg-primary/20 text-primary">
                          <Bike className="h-3.5 w-3.5" />
                        </div>
                        <span className="rounded-md bg-primary/20 px-1 py-0.5 text-[7px] font-bold text-primary">
                          Fastest
                        </span>
                      </div>
                      <div className="mt-2">
                        <p className="text-[11px] font-black text-foreground">Bike</p>
                        <p className="text-[8px] text-muted-foreground">686 mins</p>
                        <p className="text-[11px] font-extrabold text-primary mt-0.5">₦1,950</p>
                      </div>
                    </button>

                    {/* Keke Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedVehicle('KEKE')}
                      className={`relative flex flex-col justify-between rounded-2xl border p-2 text-left transition-all ${
                        selectedVehicle === 'KEKE'
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                          : 'border-border bg-background/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="grid h-6 w-6 place-items-center rounded-lg bg-muted text-muted-foreground">
                          <Truck className="h-3.5 w-3.5" />
                        </div>
                        <span className="rounded-md bg-muted px-1 py-0.5 text-[7px] font-bold text-muted-foreground">
                          Popular
                        </span>
                      </div>
                      <div className="mt-2">
                        <p className="text-[11px] font-black text-foreground">Keke Napep</p>
                        <p className="text-[8px] text-muted-foreground">Neighborhood load</p>
                        <p className="text-[11px] font-extrabold text-foreground mt-0.5">₦2,438</p>
                      </div>
                    </button>
                  </div>

                  <p className="text-[8px] text-center text-muted-foreground">
                    Local delivery route detected. Nearby bikers will be matched.
                  </p>

                  <button
                    type="button"
                    className="w-full rounded-2xl bg-primary py-2.5 text-center text-xs font-extrabold text-white shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all"
                  >
                    Continue
                  </button>
                </div>
              ) : (
                /* Interstate Transit Hub Section */
                <div className="rounded-3xl border border-border/80 bg-card/95 p-2.5 space-y-2 backdrop-blur-2xl shadow-2xl">
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Truck className="h-3.5 w-3.5 text-primary" />
                    <p className="text-[11px] font-extrabold text-foreground">Select transit network hubs</p>
                  </div>

                  {/* Hub Selection Cards */}
                  <div className="space-y-1.5">
                    <div
                      onClick={() => setShowHubModal(true)}
                      className="cursor-pointer rounded-2xl border border-border bg-background/60 p-2 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-[8px] font-bold uppercase text-muted-foreground">Origin hub</p>
                        <p className="text-[11px] font-extrabold text-foreground">{originHub}</p>
                        <p className="text-[8px] text-muted-foreground">Entering interstate network</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-primary" />
                    </div>

                    <div
                      onClick={() => setShowHubModal(true)}
                      className="cursor-pointer rounded-2xl border border-border bg-background/60 p-2 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-[8px] font-bold uppercase text-muted-foreground">Destination hub</p>
                        <p className="text-[11px] font-extrabold text-foreground">{destHub}</p>
                        <p className="text-[8px] text-muted-foreground">Receiving station at recipient state</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-full rounded-2xl bg-primary py-2.5 text-center text-xs font-extrabold text-white shadow-lg shadow-primary/30"
                  >
                    Complete details to continue
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Hub Selection Modal Overlay */}
          <AnimatePresence>
            {showHubModal && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute inset-0 z-40 bg-card p-3 flex flex-col space-y-2.5"
              >
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <h4 className="text-xs font-extrabold text-foreground">Select hub</h4>
                  <button
                    type="button"
                    onClick={() => setShowHubModal(false)}
                    className="text-[10px] font-bold text-primary"
                  >
                    Close
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3 w-3 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search city, state, or hub"
                    className="w-full rounded-xl border border-border bg-background pl-8 pr-2.5 py-1.5 text-[10px] text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                  {hubs.map((h, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setOriginHub(`${h.name} Hub, ${h.city}`);
                        setShowHubModal(false);
                      }}
                      className="cursor-pointer rounded-2xl border border-border bg-background/60 p-2.5 flex items-center justify-between hover:border-primary"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-black text-foreground">{h.name}</span>
                          <span className="rounded-md bg-emerald-500/20 px-1 py-0.5 text-[7px] font-bold text-emerald-400">
                            {h.type}
                          </span>
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{h.address}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
