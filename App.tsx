import { useState, useEffect, useCallback } from 'react';
import SunCalc from 'suncalc';

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface GpsPos { lat: number; lon: number; city: string }
interface NightInfo { start: Date | null; end: Date | null; durationH: number }
interface MoonInfo {
  phase: number; phaseName: string; illumination: number;
  rise: Date | null; set: Date | null; azimuth: number; altitude: number;
}
interface WeatherHour {
  time: string; cloudLow: number; cloudHigh: number; cloudTotal: number;
  temp: number; windSpeed: number; windGusts: number; humidity: number;
  seeing: number; fog: boolean; hour: number;
}
interface KpData { kp: number; source: 'api' | 'manual' }

// ─── EQUIPMENT DATA ───────────────────────────────────────────────────────────
const MOUNTS = [
  { name: 'ZWO AM3', maxLoad: 8, power: 18, weight: 4.2 },
  { name: 'ZWO AM5', maxLoad: 13, power: 24, weight: 5.8 },
  { name: 'SkyWatcher HEQ5 Pro', maxLoad: 11, power: 10, weight: 11.5 },
  { name: 'SkyWatcher EQ6-R Pro', maxLoad: 20, power: 12, weight: 16.5 },
  { name: 'SkyWatcher AZ-EQ5', maxLoad: 10, power: 8, weight: 8.2 },
  { name: 'SkyWatcher EQ8-R Pro', maxLoad: 50, power: 20, weight: 32.5 },
  { name: 'SkyWatcher Star Adventurer GTi', maxLoad: 5, power: 4, weight: 1.5 },
  { name: 'SkyWatcher Star Adventurer Pro', maxLoad: 3, power: 3, weight: 0.5 },
  { name: 'iOptron CEM26', maxLoad: 12, power: 6, weight: 5.2 },
  { name: 'iOptron CEM40', maxLoad: 18, power: 8, weight: 6.5 },
  { name: 'iOptron GEM45', maxLoad: 20, power: 9, weight: 7.8 },
  { name: 'iOptron CEM70', maxLoad: 31, power: 10, weight: 11.2 },
  { name: 'iOptron SkyGuider Pro', maxLoad: 3, power: 3, weight: 1.2 },
  { name: 'Rainbow Astro RST-135', maxLoad: 13, power: 15, weight: 3.2 },
  { name: '10Micron GM1000 HPS', maxLoad: 45, power: 15, weight: 22 },
  { name: '10Micron GM2000 HPS', maxLoad: 65, power: 18, weight: 28 },
  { name: 'Astro-Physics 1100GTO', maxLoad: 50, power: 12, weight: 15.8 },
  { name: 'Takahashi EM200', maxLoad: 16, power: 10, weight: 14.5 },
  { name: 'Vixen GP2', maxLoad: 7, power: 6, weight: 5.5 },
  { name: 'Fornax LightTrack II', maxLoad: 5, power: 2, weight: 1.2 },
  { name: 'PlaneWave L-500', maxLoad: 90, power: 20, weight: 28 },
  { name: 'Losmandy G11', maxLoad: 27, power: 12, weight: 15.5 },
];

const TELESCOPES = [
  { name: 'SkyWatcher Evolux 62ED', focal: 400, diameter: 62, weight: 2.1 },
  { name: 'SkyWatcher Evostar 72ED', focal: 420, diameter: 72, weight: 2.1 },
  { name: 'SkyWatcher Evostar 80ED', focal: 500, diameter: 80, weight: 2.8 },
  { name: 'SkyWatcher Evostar 100ED', focal: 600, diameter: 100, weight: 4.2 },
  { name: 'SkyWatcher Esprit 100ED', focal: 550, diameter: 100, weight: 4.5 },
  { name: 'William Optics RedCat 51', focal: 250, diameter: 51, weight: 1.8 },
  { name: 'William Optics RedCat 71', focal: 350, diameter: 71, weight: 3.2 },
  { name: 'William Optics GT81', focal: 478, diameter: 81, weight: 3.5 },
  { name: 'Askar FRA400', focal: 400, diameter: 72, weight: 2.9 },
  { name: 'Askar 65PHQ', focal: 360, diameter: 65, weight: 2.6 },
  { name: 'Askar 107PHQ', focal: 560, diameter: 107, weight: 5.2 },
  { name: 'Takahashi FSQ-85', focal: 450, diameter: 85, weight: 3.8 },
  { name: 'Takahashi FSQ-106', focal: 530, diameter: 106, weight: 6.0 },
  { name: 'Celestron RASA 8', focal: 400, diameter: 203, weight: 7.5 },
  { name: 'Celestron EdgeHD 800', focal: 2032, diameter: 203, weight: 5.4 },
];

const ASTRO_CAMERAS = [
  { name: 'ZWO ASI120MM Mini', pixel: 3.75, weight: 0.12, power: 2, format: 'astro' },
  { name: 'ZWO ASI174MM', pixel: 5.86, weight: 0.18, power: 3, format: 'astro' },
  { name: 'ZWO ASI183MC Pro', pixel: 2.4, weight: 0.45, power: 6, format: 'astro' },
  { name: 'ZWO ASI533MC Pro', pixel: 3.76, weight: 0.48, power: 6, format: 'astro' },
  { name: 'ZWO ASI2600MC Pro', pixel: 3.76, weight: 0.65, power: 8, format: 'astro' },
  { name: 'ZWO ASI294MC Pro', pixel: 4.63, weight: 0.52, power: 7, format: 'astro' },
  { name: 'ZWO ASI2400MC Pro', pixel: 5.94, weight: 0.85, power: 10, format: 'astro' },
  { name: 'Player One Mars-M', pixel: 3.75, weight: 0.13, power: 2, format: 'astro' },
  { name: 'Player One Artemis-C', pixel: 3.76, weight: 0.62, power: 8, format: 'astro' },
  { name: 'QHY268C', pixel: 3.76, weight: 0.68, power: 8, format: 'astro' },
];

const DSLR_CAMERAS = [
  { name: 'Canon EOS 600D', pixel: 4.3, weight: 0.57, power: 5, format: 'APS-C' },
  { name: 'Canon EOS 800D', pixel: 3.72, weight: 0.53, power: 5, format: 'APS-C' },
  { name: 'Canon EOS 6D', pixel: 6.55, weight: 0.77, power: 6, format: 'FF' },
  { name: 'Nikon D5600', pixel: 3.89, weight: 0.47, power: 5, format: 'APS-C' },
  { name: 'Nikon D750', pixel: 5.95, weight: 0.84, power: 6, format: 'FF' },
  { name: 'Sony A6000', pixel: 3.89, weight: 0.34, power: 5, format: 'APS-C' },
  { name: 'Sony A7 III', pixel: 5.94, weight: 0.65, power: 6, format: 'FF' },
  { name: 'Fujifilm X-T4', pixel: 3.77, weight: 0.61, power: 5, format: 'APS-C' },
];

const LENSES = [
  { name: 'Samyang 14mm f/2.8', focal: 14, weight: 0.78 },
  { name: 'Samyang 24mm f/1.4', focal: 24, weight: 0.72 },
  { name: 'Samyang 135mm f/2', focal: 135, weight: 0.83 },
  { name: 'Sigma 14mm f/1.8 Art', focal: 14, weight: 1.17 },
  { name: 'Sigma 35mm f/1.4 Art', focal: 35, weight: 0.81 },
  { name: 'Sigma 50mm f/1.4 Art', focal: 50, weight: 0.82 },
  { name: 'Canon EF 50mm f/1.4', focal: 50, weight: 0.48 },
  { name: 'Canon EF 135mm f/2L', focal: 135, weight: 0.85 },
  { name: 'Nikon 50mm f/1.4G', focal: 50, weight: 0.28 },
  { name: 'Nikon 85mm f/1.4G', focal: 85, weight: 0.60 },
  { name: 'Tokina 11-16mm f/2.8', focal: 13, weight: 0.55 },
  { name: 'Laowa 12mm f/2.8', focal: 12, weight: 0.61 },
];

const REDUCERS = [
  { name: 'Réducteur x0.7', factor: 0.7 }, { name: 'Réducteur x0.75', factor: 0.75 },
  { name: 'Réducteur x0.8', factor: 0.8 }, { name: 'Réducteur x0.85', factor: 0.85 },
  { name: 'Réducteur x0.9', factor: 0.9 }, { name: 'Réducteur x2', factor: 2 },
  { name: 'Réducteur x3', factor: 3 }, { name: 'Réducteur x5', factor: 5 },
];

const GUIDE_SCOPES = [
  { name: 'ZWO 30/120mm', focal: 120, weight: 0.15 },
  { name: 'ZWO 60/240mm', focal: 240, weight: 0.25 },
  { name: 'WO 32mm', focal: 130, weight: 0.18 },
  { name: 'SW 50mm', focal: 162, weight: 0.35 },
];

const GUIDE_CAMERAS = [
  { name: 'ZWO ASI120MM Mini (guidage)', pixel: 3.75, weight: 0.12, power: 2 },
  { name: 'ZWO ASI220MM Mini (guidage)', pixel: 2.9, weight: 0.13, power: 2 },
  { name: 'ZWO ASI174MM (guidage)', pixel: 5.86, weight: 0.18, power: 3 },
];

const EAF_OPTIONS = [
  { name: 'ZWO EAF V1', weight: 0.28, power: 2 },
  { name: 'ZWO EAF V2', weight: 0.30, power: 2 },
  { name: 'Pegasus FocusCube', weight: 0.35, power: 2.5 },
];

const FILTER_OPTIONS = [
  { name: 'Tiroir filtre', weight: 0.12, power: 0 },
  { name: 'ZWO EFW 5 pos', weight: 0.28, power: 2 },
  { name: 'ZWO EFW 7 pos', weight: 0.38, power: 2 },
  { name: 'ZWO EFW 8 pos', weight: 0.52, power: 2 },
];

const ASIAIR_OPTIONS = [
  { name: 'ASIAIR Pro', power: 10, weight: 0.45 },
  { name: 'ASIAIR Plus', power: 12, weight: 0.52 },
  { name: 'ASIAIR Mini', power: 8, weight: 0.18 },
  { name: 'Eagle 4', power: 15, weight: 0.85 },
];

const BATTERIES = [
  { name: 'Bluetti EB3A', capacity: 268 },
  { name: 'EcoFlow River 2', capacity: 256 },
  { name: 'EcoFlow Delta 2', capacity: 1024 },
  { name: 'Jackery 500', capacity: 518 },
  { name: 'Jackery 1000', capacity: 1002 },
  { name: 'Anker 757', capacity: 1229 },
  { name: 'Talentcell 72Wh', capacity: 72 },
  { name: 'Li-ion 100Wh', capacity: 100 },
  { name: 'Li-ion 200Wh', capacity: 200 },
];

const BORTLE_DESC = [
  '', 'Ciel noir parfait \u2013 Zodiacal visible, M33 \u00e0 l\u2019\u0153il nu',
  'Ciel noir vrai \u2013 Airglow visible \u00e0 l\u2019horizon',
  'Ciel rural \u2013 M33 visible avec effort',
  'Rural/Suburbain \u2013 Voie Lact\u00e9e d\u00e9taill\u00e9e',
  'Suburbain \u2013 Voie Lact\u00e9e p\u00e2le',
  'Suburbain clair \u2013 Voie Lact\u00e9e difficile',
  'P\u00e9riurbain \u2013 Ciel gris-blanc',
  'Urbain \u2013 Quelques n\u00e9buleuses brillantes',
  'Centre-ville \u2013 Quelques \u00e9toiles brillantes',
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmtTime = (d: Date | null) => d ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
const radToDeg = (r: number) => (r * 180 / Math.PI + 360) % 360;
const moonPhaseName = (phase: number): string => {
  if (phase < 0.03 || phase > 0.97) return '🌑 Nouvelle Lune';
  if (phase < 0.22) return '🌒 Premier Croissant';
  if (phase < 0.28) return '🌓 Premier Quartier';
  if (phase < 0.47) return '🌔 Gibbeuse Croissante';
  if (phase < 0.53) return '🌕 Pleine Lune';
  if (phase < 0.72) return '🌖 Gibbeuse Décroissante';
  if (phase < 0.78) return '🌗 Dernier Quartier';
  return '🌘 Dernier Croissant';
};
const cloudColor = (pct: number, night: boolean) => {
  if (pct < 20) return night ? 'text-green-400' : 'text-green-600';
  if (pct < 60) return night ? 'text-yellow-400' : 'text-yellow-600';
  return night ? 'text-red-400' : 'text-red-600';
};


// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [nightMode, setNightMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'night' | 'meteo' | 'materiel' | 'asiair' | 'calculs'>('night');

  // GPS
  const [gps, setGps] = useState<GpsPos | null>(null);
  const [gpsError, setGpsError] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  // Night
  const [nightInfo, setNightInfo] = useState<NightInfo>({ start: null, end: null, durationH: 0 });
  const [moonInfo, setMoonInfo] = useState<MoonInfo>({ phase: 0, phaseName: '', illumination: 0, rise: null, set: null, azimuth: 0, altitude: 0 });
  const [bortle, setBortle] = useState<number>(() => Number(localStorage.getItem('bortle') || '4'));
  const [kpData, setKpData] = useState<KpData>({ kp: 0, source: 'manual' });
  const [kpManual, setKpManual] = useState(0);

  // Meteo
  const [weather, setWeather] = useState<WeatherHour[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');

  // Mode switch A/B
  const [mountMode, setMountMode] = useState<boolean>(() => localStorage.getItem('mountMode') !== 'false');

  // ── Mode Monture (A) ──
  const [mountIdx, setMountIdx] = useState<number>(() => Number(localStorage.getItem('mA_mountIdx') || '0'));
  const [scopeIdx, setScopeIdx] = useState<number>(() => Number(localStorage.getItem('mA_scopeIdx') || '0'));
  const [camTypeA, setCamTypeA] = useState<'astro' | 'dslr'>(() => (localStorage.getItem('mA_camType') as 'astro' | 'dslr') || 'astro');
  const [camIdxA, setCamIdxA] = useState<number>(() => Number(localStorage.getItem('mA_camIdx') || '0'));
  const [reducerIdxA, setReducerIdxA] = useState<number>(() => Number(localStorage.getItem('mA_reducerIdx') || '-1'));
  const [hasEAF, setHasEAF] = useState(false);
  const [eafIdx, setEafIdx] = useState(0);
  const [hasFilter, setHasFilter] = useState(false);
  const [filterIdx, setFilterIdx] = useState(0);
  const [hasGuideScope, setHasGuideScope] = useState(false);
  const [guideScopeIdx, setGuideScopeIdx] = useState(0);
  const [hasGuideCam, setHasGuideCam] = useState(false);
  const [guideCamIdx, setGuideCamIdx] = useState(0);
  const [hasASIAIR, setHasASIAIR] = useState(false);
  const [asiairIdx, setAsiairIdx] = useState(0);
  const [asiairPos, setAsiairPos] = useState<'mount' | 'tripod'>('mount');
  const [heaterOptPct, setHeaterOptPct] = useState(0);
  const [heaterGuide, setHeaterGuide] = useState(false);
  const [heaterGuidePct, setHeaterGuidePct] = useState(0);
  const [powerSource, setPowerSource] = useState<'battery' | 'separate' | 'cells'>('battery');
  const [batteryIdx, setBatteryIdx] = useState(0);
  const [_exposureTimeA, _setExposureTimeA] = useState(120);

  // ── Mode Trépied (B) ──
  const [camTypeB, setCamTypeB] = useState<'dslr' | 'astro'>(() => (localStorage.getItem('mB_camType') as 'dslr' | 'astro') || 'dslr');
  const [camIdxB, setCamIdxB] = useState<number>(() => Number(localStorage.getItem('mB_camIdx') || '0'));
  const [lensIdxB, setLensIdxB] = useState<number>(() => Number(localStorage.getItem('mB_lensIdx') || '0'));
  const [reducerIdxB, setReducerIdxB] = useState<number>(-1);
  const [exposureTimeB, setExposureTimeB] = useState(30);
  const [isoB, setIsoB] = useState(1600);

  // ASIAIR/Guidage tab
  const [guideRate, setGuideRate] = useState(0.5);
  const [aggroRA, setAggroRA] = useState(70);
  const [aggroDEC, setAggroDEC] = useState(70);
  const [guideExp, setGuideExp] = useState(2.0);
  const [minMove, setMinMove] = useState(0.3);
  const [stepMeasured, setStepMeasured] = useState('');
  const [errorRA, setErrorRA] = useState('');
  const [errorDEC, setErrorDEC] = useState('');
  const [rmsTotal, setRmsTotal] = useState('');
  const [guidePoints, setGuidePoints] = useState<{ ra: number[]; dec: number[] }>({ ra: [], dec: [] });

  // Calculs
  const [poseTime, setPoseTime] = useState(120);

  const nm = nightMode;

  // ─── GPS & GEOCODING ────────────────────────────────────────────────────────
  const requestGPS = useCallback(() => {
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        let city = `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
        try {
          const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=fr`);
          const d = await r.json();
          city = d.city || d.locality || d.principalSubdivision || city;
        } catch { /* fallback to coords */ }
        setGps({ lat, lon, city });
        setGpsLoading(false);
      },
      (err) => { setGpsError(err.message); setGpsLoading(false); },
      { timeout: 10000 }
    );
  }, []);

  // ─── ASTRONOMICAL CALCULATIONS ───────────────────────────────────────────────
  useEffect(() => {
    if (!gps) return;
    const { lat, lon } = gps;
    const now = new Date();
    const times = SunCalc.getTimes(now, lat, lon);
    // Nuit astronomique = quand le soleil est \u00e0 -18\u00b0 (night \u2192 nightEnd)
    const start = times.night instanceof Date && !isNaN(times.night.getTime()) ? times.night : null;
    // Pour la fin, chercher le lendemain
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowTimes = SunCalc.getTimes(tomorrow, lat, lon);
    const end = tomorrowTimes.nightEnd instanceof Date && !isNaN(tomorrowTimes.nightEnd.getTime()) ? tomorrowTimes.nightEnd : null;
    const durationH = start && end ? (end.getTime() - start.getTime()) / 3600000 : 0;
    setNightInfo({ start, end, durationH });

    const moonIll = SunCalc.getMoonIllumination(now);
    const moonPos = SunCalc.getMoonPosition(now, lat, lon);
    const moonTimes = SunCalc.getMoonTimes(now, lat, lon);
    setMoonInfo({
      phase: moonIll.phase,
      phaseName: moonPhaseName(moonIll.phase),
      illumination: Math.round(moonIll.fraction * 100),
      rise: moonTimes.rise || null,
      set: moonTimes.set || null,
      azimuth: radToDeg(moonPos.azimuth),
      altitude: Math.round(moonPos.altitude * 180 / Math.PI),
    });
  }, [gps]);

  // Real-time moon azimuth
  useEffect(() => {
    if (!gps) return;
    const interval = setInterval(() => {
      const moonPos = SunCalc.getMoonPosition(new Date(), gps.lat, gps.lon);
      setMoonInfo(prev => ({
        ...prev,
        azimuth: radToDeg(moonPos.azimuth),
        altitude: Math.round(moonPos.altitude * 180 / Math.PI),
      }));
    }, 60000);
    return () => clearInterval(interval);
  }, [gps]);

  // ─── KP INDEX ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const cached = localStorage.getItem('kpCache');
    if (cached) {
      const { value, time } = JSON.parse(cached);
      if (Date.now() - time < 3600000) { setKpData({ kp: value, source: 'api' }); return; }
    }
    fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json')
      .then(r => r.json())
      .then((data: string[][]) => {
        const last = data[data.length - 1];
        const kp = parseFloat(last[1]);
        setKpData({ kp, source: 'api' });
        localStorage.setItem('kpCache', JSON.stringify({ value: kp, time: Date.now() }));
      })
      .catch(() => setKpData({ kp: kpManual, source: 'manual' }));
  }, []);

  // ─── WEATHER ─────────────────────────────────────────────────────────────────
  const fetchWeather = useCallback(async () => {
    if (!gps) return;
    setWeatherLoading(true); setWeatherError('');
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${gps.lat}&longitude=${gps.lon}&hourly=cloud_cover,cloud_cover_low,cloud_cover_high,temperature_2m,wind_speed_10m,wind_gusts_10m,relative_humidity_2m&forecast_days=2&wind_speed_unit=kmh&timezone=auto`;
      const r = await fetch(url);
      const d = await r.json();
      const now = new Date();
      const hours = d.hourly.time as string[];
      const result: WeatherHour[] = [];
      for (let i = 0; i < hours.length && result.length < 24; i++) {
        const t = new Date(hours[i]);
        if (t < now) continue;
        const wind = d.hourly.wind_speed_10m[i] as number;
        const hum = d.hourly.relative_humidity_2m[i] as number;
        const cloud = d.hourly.cloud_cover[i] as number;
        const temp = d.hourly.temperature_2m[i] as number;
        // Seeing estimé (heuristique)
        let seeing = 3.0;
        if (wind < 10 && hum < 60) seeing = 1.5;
        else if (wind < 20 && hum < 75) seeing = 2.5;
        result.push({
          time: hours[i],
          hour: t.getHours(),
          cloudLow: d.hourly.cloud_cover_low[i] as number,
          cloudHigh: d.hourly.cloud_cover_high[i] as number,
          cloudTotal: cloud,
          temp,
          windSpeed: wind,
          windGusts: d.hourly.wind_gusts_10m[i] as number,
          humidity: hum,
          seeing,
          fog: hum > 95 && wind < 5,
        });
      }
      setWeather(result);
    } catch (e) {
      setWeatherError('Erreur chargement météo. Vérifiez votre connexion.');
    }
    setWeatherLoading(false);
  }, [gps]);

  useEffect(() => { if (gps) fetchWeather(); }, [gps]);

  // ─── PERSIST ──────────────────────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem('bortle', String(bortle)); }, [bortle]);
  useEffect(() => { localStorage.setItem('mountMode', String(mountMode)); }, [mountMode]);
  useEffect(() => { localStorage.setItem('mA_mountIdx', String(mountIdx)); }, [mountIdx]);
  useEffect(() => { localStorage.setItem('mA_scopeIdx', String(scopeIdx)); }, [scopeIdx]);
  useEffect(() => { localStorage.setItem('mA_camType', camTypeA); }, [camTypeA]);
  useEffect(() => { localStorage.setItem('mA_camIdx', String(camIdxA)); }, [camIdxA]);
  useEffect(() => { localStorage.setItem('mB_camType', camTypeB); }, [camTypeB]);
  useEffect(() => { localStorage.setItem('mB_camIdx', String(camIdxB)); }, [camIdxB]);
  useEffect(() => { localStorage.setItem('mB_lensIdx', String(lensIdxB)); }, [lensIdxB]);

  // ─── COMPUTED VALUES ─────────────────────────────────────────────────────────
  const mount = MOUNTS[mountIdx];
  const scope = TELESCOPES[scopeIdx];
  const camListA = camTypeA === 'astro' ? ASTRO_CAMERAS : DSLR_CAMERAS;
  const camA = camListA[camIdxA];
  const reducerA = reducerIdxA >= 0 ? REDUCERS[reducerIdxA] : null;
  const effectiveFocalA = reducerA ? scope.focal * reducerA.factor : scope.focal;
  const samplingA = camA ? (camA.pixel / effectiveFocalA) * 206.265 : 0;

  // Poids sur monture (mode A) – sans la monture elle-même
  const mountPayload = (() => {
    let w = scope.weight + 0.2; // tube + câbles
    if (camA) w += camA.weight;
    if (reducerA) w += 0.1;
    if (hasEAF) w += EAF_OPTIONS[eafIdx].weight;
    if (hasFilter) w += FILTER_OPTIONS[filterIdx].weight;
    if (hasGuideScope) w += GUIDE_SCOPES[guideScopeIdx].weight;
    if (hasGuideCam) w += GUIDE_CAMERAS[guideCamIdx].weight;
    if (hasASIAIR && asiairPos === 'mount') w += ASIAIR_OPTIONS[asiairIdx].weight;
    if (heaterOptPct > 0) w += 0.05;
    if (heaterGuide && heaterGuidePct > 0) w += 0.05;
    return w;
  })();
  const chargePercent = mount ? (mountPayload / mount.maxLoad) * 100 : 0;

  // Consommation (mode A)
  const totalPower = (() => {
    let p = 0;
    if (hasASIAIR) p += ASIAIR_OPTIONS[asiairIdx].power;
    if (powerSource === 'battery') p += mount.power;
    if (camA) p += camA.power;
    if (hasGuideCam) p += GUIDE_CAMERAS[guideCamIdx].power;
    if (hasEAF) p += EAF_OPTIONS[eafIdx].power;
    if (hasFilter) p += FILTER_OPTIONS[filterIdx].power;
    if (heaterOptPct > 0) p += 12 * heaterOptPct / 100;
    if (heaterGuide && heaterGuidePct > 0) p += 6 * heaterGuidePct / 100;
    return p;
  })();
  const battery = BATTERIES[batteryIdx];
  const autonomy = totalPower > 0 ? (battery.capacity * 0.85) / totalPower : 0;

  // Mode B
  const lensB = LENSES[lensIdxB];
  const reducerB = reducerIdxB >= 0 ? REDUCERS[reducerIdxB] : null;
  const effectiveFocalB = lensB ? (reducerB ? lensB.focal * reducerB.factor : lensB.focal) : 0;
  const formatB = camTypeB === 'dslr' ? (DSLR_CAMERAS[camIdxB]?.format || 'APS-C') : 'APS-C';
  const ruleB = formatB === 'FF' ? 500 : formatB === 'APS-C' ? 300 : 200;
  const maxExpB = effectiveFocalB > 0 ? Math.round(ruleB / effectiveFocalB) : 0;

  // ASIAIR / Guidage calculations
  const guideScale = hasGuideScope && hasGuideCam
    ? (GUIDE_CAMERAS[guideCamIdx].pixel / GUIDE_SCOPES[guideScopeIdx].focal) * 206.265
    : 0;
  const stepSize = guideScale > 0 ? Math.round((0.8 * guideScale) / (guideRate * 15) * 1000) : 0;
  const maxRADur = stepSize * 12;
  const maxDECDur = Math.round(maxRADur * 1.15);
  const minMoveCalc = guideScale > 0 ? parseFloat((guideScale * 0.3).toFixed(2)) : 0.3;

  // Poses par heure / nuit
  const goodHours = weather.filter(h => h.cloudTotal < 20).length;
  const posesPerHour = poseTime > 0 ? Math.floor(3600 / poseTime) : 0;
  const posesPerNight = posesPerHour * goodHours;

  // Moon opposition direction
  const moonOppAz = ((moonInfo.azimuth + 180) % 360).toFixed(0);
  const compassDir = (az: number) => {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
    return dirs[Math.round(az / 22.5) % 16];
  };

  // Guidage diagnostic
  const raErr = parseFloat(errorRA) || 0;
  const decErr = parseFloat(errorDEC) || 0;
  const rms = parseFloat(rmsTotal) || 0;
  const getDiagnosis = () => {
    const diag: string[] = [];
    if (rms < 0.5 && rms > 0) diag.push('✅ Excellent guidage !');
    else if (rms >= 0.5 && rms < 0.8) diag.push('👍 Bon guidage, peut être amélioré');
    else if (rms >= 0.8) diag.push('⚠️ Guidage médiocre → recalibrez');
    if (raErr > 1.0 && decErr > 1.0) diag.push('🔧 Vérifiez mise en station et équilibrage');
    else if (raErr > 1.0 && decErr < 0.8) diag.push('📈 Augmentez agressivité RA de 5-10%');
    else if (raErr < 0.8 && decErr > 1.0) diag.push('🔄 Vérifiez backlash DEC');
    if (raErr > 1.5) diag.push('⚠️ Vérifiez courroie/tangente et équilibrage');
    return diag;
  };

  // Apply guide graph
  const applyGuideGraph = () => {
    const ra = raErr || 0.6;
    const dec = decErr || 0.4;
    const pts: { ra: number[]; dec: number[] } = { ra: [], dec: [] };
    for (let i = 0; i < 60; i++) {
      pts.ra.push((Math.sin(i * 0.3) * ra + Math.random() * ra * 0.4 - ra * 0.2));
      pts.dec.push((Math.cos(i * 0.25) * dec + Math.random() * dec * 0.3 - dec * 0.15));
    }
    setGuidePoints(pts);
  };

  // ─── SVG GUIDE GRAPH ─────────────────────────────────────────────────────────
  const GuideGraph = () => {
    const W = 400, H = 120;
    if (!guidePoints.ra.length) return (
      <div className={`flex items-center justify-center h-32 rounded-lg border ${nm ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
        <span className="text-sm">Saisissez les erreurs et cliquez "Appliquer"</span>
      </div>
    );
    const allVals = [...guidePoints.ra, ...guidePoints.dec];
    const maxVal = Math.max(Math.abs(Math.min(...allVals)), Math.abs(Math.max(...allVals)), 1);
    const scaleY = (v: number) => H / 2 - (v / maxVal) * (H / 2 - 10);
    const scaleX = (i: number) => (i / (guidePoints.ra.length - 1)) * W;
    const raPts = guidePoints.ra.map((v, i) => `${scaleX(i)},${scaleY(v)}`).join(' ');
    const decPts = guidePoints.dec.map((v, i) => `${scaleX(i)},${scaleY(v)}`).join(' ');
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg border border-gray-600" style={{ background: nm ? '#111827' : '#1f2937' }}>
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="#4b5563" strokeWidth="1" />
        <line x1="0" y1={H / 4} x2={W} y2={H / 4} stroke="#374151" strokeWidth="0.5" strokeDasharray="4,4" />
        <line x1="0" y1={3 * H / 4} x2={W} y2={3 * H / 4} stroke="#374151" strokeWidth="0.5" strokeDasharray="4,4" />
        <polyline points={raPts} fill="none" stroke="#60a5fa" strokeWidth="1.5" />
        <polyline points={decPts} fill="none" stroke="#f87171" strokeWidth="1.5" />
        <text x="4" y="14" fill="#60a5fa" fontSize="10">RA</text>
        <text x="24" y="14" fill="#f87171" fontSize="10">DEC</text>
        <text x={W - 30} y={H / 2 - 4} fill="#9ca3af" fontSize="9">0"</text>
        <text x={W - 50} y="14" fill="#9ca3af" fontSize="9">+{maxVal.toFixed(1)}"</text>
        <text x={W - 50} y={H - 4} fill="#9ca3af" fontSize="9">-{maxVal.toFixed(1)}"</text>
      </svg>
    );
  };

  // ─── STYLES ───────────────────────────────────────────────────────────────────
  const bg = nm ? 'bg-gray-950 text-red-100' : 'bg-gray-50 text-gray-900';
  const card = nm ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const cardInner = nm ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100';
  const input = nm ? 'bg-gray-800 border-gray-600 text-red-100 focus:border-red-500' : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500';
  const btnPrim = nm ? 'bg-red-800 hover:bg-red-700 text-red-100' : 'bg-blue-600 hover:bg-blue-700 text-white';
  const label = nm ? 'text-red-300' : 'text-gray-600';
  const head2 = nm ? 'text-red-400' : 'text-blue-700';
  const tabBar = nm ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const tabActive = nm ? 'text-red-400 border-red-500' : 'text-blue-600 border-blue-500';
  const tabInactive = nm ? 'text-gray-500 hover:text-red-300' : 'text-gray-500 hover:text-gray-700';
  const select = nm ? 'bg-gray-800 border-gray-600 text-red-100' : 'bg-white border-gray-300 text-gray-900';


  // ─── TAB: NUIT & CIEL ────────────────────────────────────────────────────────
  const TabNight = () => (
    <div className="space-y-4">
      {/* GPS */}
      <div className={`rounded-xl border p-4 ${card}`}>
        <h2 className={`text-lg font-bold mb-3 flex items-center gap-2 ${head2}`}>
          📍 Localisation GPS
        </h2>
        {!gps ? (
          <div className="text-center">
            <p className={`mb-3 text-sm ${label}`}>Autorisez la géolocalisation pour des calculs précis</p>
            <button onClick={requestGPS} disabled={gpsLoading}
              className={`px-5 py-2 rounded-lg font-semibold transition ${btnPrim} disabled:opacity-60`}>
              {gpsLoading ? '⏳ Localisation...' : '📡 Activer GPS'}
            </button>
            {gpsError && <p className="mt-2 text-red-500 text-sm">⚠️ {gpsError}</p>}
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className={`font-bold text-xl ${nm ? 'text-red-200' : 'text-gray-800'}`}>📍 {gps.city}</span>
              <button onClick={requestGPS} className={`text-xs px-2 py-1 rounded ${nm ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>↺ Actualiser</button>
            </div>
            <div className={`text-xs ${label}`}>{gps.lat.toFixed(4)}°N {gps.lon.toFixed(4)}°E</div>
          </div>
        )}
      </div>

      {/* Nuit astronomique */}
      <div className={`rounded-xl border p-4 ${card}`}>
        <h2 className={`text-lg font-bold mb-3 flex items-center gap-2 ${head2}`}>🌙 Nuit Astronomique</h2>
        {!gps ? <p className={`text-sm ${label}`}>GPS requis</p> : (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Début', value: fmtTime(nightInfo.start) },
              { label: 'Fin', value: fmtTime(nightInfo.end) },
              { label: 'Durée', value: nightInfo.durationH > 0 ? `${nightInfo.durationH.toFixed(1)}h` : '--' },
            ].map(({ label: l, value }) => (
              <div key={l} className={`rounded-lg p-3 text-center border ${cardInner}`}>
                <div className={`text-xs mb-1 ${label}`}>{l}</div>
                <div className={`text-xl font-bold ${nm ? 'text-red-200' : 'text-gray-800'}`}>{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lune */}
      <div className={`rounded-xl border p-4 ${card}`}>
        <h2 className={`text-lg font-bold mb-3 flex items-center gap-2 ${head2}`}>🌕 Lune</h2>
        {!gps ? <p className={`text-sm ${label}`}>GPS requis</p> : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-lg p-3 border ${cardInner}`}>
                <div className={`text-xs mb-1 ${label}`}>Phase</div>
                <div className={`font-semibold text-sm ${nm ? 'text-red-200' : 'text-gray-800'}`}>{moonInfo.phaseName}</div>
              </div>
              <div className={`rounded-lg p-3 border ${cardInner}`}>
                <div className={`text-xs mb-1 ${label}`}>Illumination</div>
                <div className={`text-2xl font-bold ${nm ? 'text-yellow-400' : 'text-yellow-600'}`}>{moonInfo.illumination}%</div>
              </div>
            </div>
            {/* Barre illumination */}
            <div>
              <div className={`text-xs mb-1 ${label}`}>Barre d'illumination</div>
              <div className="h-4 rounded-full bg-gray-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${moonInfo.illumination}%`, background: `linear-gradient(90deg, #facc15 0%, #f59e0b ${moonInfo.illumination}%)` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-lg p-3 border ${cardInner}`}>
                <div className={`text-xs mb-1 ${label}`}>Lever Lune</div>
                <div className={`font-bold ${nm ? 'text-red-200' : 'text-gray-800'}`}>{fmtTime(moonInfo.rise)}</div>
              </div>
              <div className={`rounded-lg p-3 border ${cardInner}`}>
                <div className={`text-xs mb-1 ${label}`}>Coucher Lune</div>
                <div className={`font-bold ${nm ? 'text-red-200' : 'text-gray-800'}`}>{fmtTime(moonInfo.set)}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-lg p-3 border ${cardInner}`}>
                <div className={`text-xs mb-1 ${label}`}>Azimut Lune</div>
                <div className={`font-bold text-lg ${nm ? 'text-red-200' : 'text-gray-800'}`}>{moonInfo.azimuth.toFixed(1)}° {compassDir(moonInfo.azimuth)}</div>
              </div>
              <div className={`rounded-lg p-3 border ${cardInner}`}>
                <div className={`text-xs mb-1 ${label}`}>Altitude</div>
                <div className={`font-bold text-lg ${nm ? 'text-red-200' : 'text-gray-800'}`}>{moonInfo.altitude}°</div>
              </div>
            </div>
            {/* Impact lunaire */}
            <div className={`rounded-lg p-3 border ${moonInfo.illumination > 50 ? (nm ? 'border-red-800 bg-red-950' : 'border-red-200 bg-red-50') : cardInner}`}>
              <div className={`text-xs mb-1 ${label}`}>Impact Lunaire</div>
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold">{moonInfo.illumination > 50 ? '🌕' : '🌑'}</div>
                <div>
                  <div className={`font-semibold ${moonInfo.illumination > 50 ? (nm ? 'text-red-400' : 'text-red-600') : (nm ? 'text-green-400' : 'text-green-600')}`}>
                    {moonInfo.illumination > 80 ? 'Très fort' : moonInfo.illumination > 50 ? 'Modéré' : moonInfo.illumination > 25 ? 'Faible' : 'Négligeable'}
                  </div>
                  {moonInfo.illumination > 50 && (
                    <div className={`text-xs ${nm ? 'text-yellow-400' : 'text-yellow-600'}`}>
                      🧭 Shootez vers {compassDir(parseFloat(moonOppAz))} ({moonOppAz}°) – côté opposé à la Lune
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bortle */}
      <div className={`rounded-xl border p-4 ${card}`}>
        <h2 className={`text-lg font-bold mb-3 flex items-center gap-2 ${head2}`}>⭐ Index Bortle</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className={`text-4xl font-black ${nm ? 'text-red-300' : 'text-blue-700'}`}>{bortle}</span>
            <div className="flex-1">
              <input type="range" min={1} max={9} value={bortle}
                onChange={e => setBortle(Number(e.target.value))}
                className="w-full accent-blue-500" />
              <div className="flex justify-between text-xs mt-1" style={{ color: nm ? '#9ca3af' : '#6b7280' }}>
                <span>1 Noir</span><span>5 Suburbain</span><span>9 Urbain</span>
              </div>
            </div>
          </div>
          {/* Gradient bar */}
          <div className="h-5 rounded-full overflow-hidden relative"
            style={{ background: 'linear-gradient(90deg, #000011 0%, #001133 11%, #002266 22%, #003399 33%, #224488 44%, #446699 55%, #8888aa 66%, #aaaacc 77%, #ddddff 88%, #ffffff 100%)' }}>
            <div className="absolute top-0 h-full w-0.5 bg-yellow-400 transition-all"
              style={{ left: `${((bortle - 1) / 8) * 100}%` }} />
          </div>
          <p className={`text-sm italic ${nm ? 'text-red-300' : 'text-gray-600'}`}>{BORTLE_DESC[bortle]}</p>
        </div>
      </div>

      {/* KP Index */}
      <div className={`rounded-xl border p-4 ${card}`}>
        <h2 className={`text-lg font-bold mb-3 flex items-center gap-2 ${head2}`}>☀️ Indice KP (Aurores)</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className={`text-5xl font-black ${kpData.kp >= 5 ? 'text-green-500' : kpData.kp >= 3 ? 'text-yellow-500' : (nm ? 'text-red-300' : 'text-gray-500')}`}>
              {kpData.kp.toFixed(1)}
            </div>
            <div>
              <div className={`text-sm font-semibold ${nm ? 'text-red-200' : 'text-gray-700'}`}>
                {kpData.kp >= 7 ? '🟢 Aurores probables' : kpData.kp >= 5 ? '🟡 Aurores possibles' : kpData.kp >= 3 ? '🟠 Activité modérée' : '⚪ Calme'}
              </div>
              <div className={`text-xs ${label}`}>Source: {kpData.source === 'api' ? '📡 NOAA API' : '✏️ Manuel'}</div>
            </div>
          </div>
          <div>
            <label className={`text-xs ${label}`}>Valeur manuelle (si API indisponible)</label>
            <div className="flex gap-2 mt-1">
              <input type="number" min={0} max={9} step={0.1} value={kpManual}
                onChange={e => setKpManual(Number(e.target.value))}
                className={`w-24 rounded border px-2 py-1 text-sm ${input}`} />
              <button onClick={() => setKpData({ kp: kpManual, source: 'manual' })}
                className={`px-3 py-1 rounded text-sm font-medium ${btnPrim}`}>Appliquer</button>
            </div>
          </div>
          <div className="h-3 rounded-full overflow-hidden"
            style={{ background: 'linear-gradient(90deg, #1d4ed8, #16a34a, #ca8a04, #dc2626, #7c3aed)' }}>
            <div className="relative h-full">
              <div className="absolute top-0 h-full w-1 bg-white rounded-full transition-all"
                style={{ left: `${(kpData.kp / 9) * 100}%`, transform: 'translateX(-50%)' }} />
            </div>
          </div>
          <div className="flex justify-between text-xs" style={{ color: nm ? '#6b7280' : '#9ca3af' }}>
            <span>0 Calme</span><span>3</span><span>5 Aurores</span><span>7</span><span>9 Tempête</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── TAB: MÉTÉO ──────────────────────────────────────────────────────────────
  const TabMeteo = () => (
    <div className="space-y-4">
      <div className={`rounded-xl border p-4 ${card}`}>
        <div className="flex justify-between items-center mb-3">
          <h2 className={`text-lg font-bold flex items-center gap-2 ${head2}`}>🌤️ Météo 24h</h2>
          <button onClick={fetchWeather} disabled={weatherLoading || !gps}
            className={`px-3 py-1 rounded text-sm ${btnPrim} disabled:opacity-50`}>
            {weatherLoading ? '⏳' : '↺'} Actualiser
          </button>
        </div>
        {!gps && <p className={`text-sm ${label}`}>GPS requis pour la météo</p>}
        {weatherError && <p className="text-red-500 text-sm">{weatherError}</p>}
        {weatherLoading && <div className="text-center py-4"><div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}
        {weather.length > 0 && (
          <>
            {/* Conseil si lune forte + ciel dégagé */}
            {moonInfo.illumination > 50 && weather[0]?.cloudTotal < 20 && (
              <div className={`mb-3 rounded-lg p-3 border ${nm ? 'bg-yellow-950 border-yellow-800' : 'bg-yellow-50 border-yellow-200'}`}>
                <p className={`text-sm font-semibold ${nm ? 'text-yellow-400' : 'text-yellow-700'}`}>
                  🌕 Lune {moonInfo.illumination}% + Ciel dégagé → Shootez vers {compassDir(parseFloat(moonOppAz))} ({moonOppAz}°)
                </p>
              </div>
            )}
            {/* En-têtes */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-max">
                <thead>
                  <tr className={`${label} border-b ${nm ? 'border-gray-700' : 'border-gray-200'}`}>
                    <th className="text-left py-2 pr-2 sticky left-0 z-10" style={{ background: nm ? '#111827' : '#fff' }}>Heure</th>
                    <th className="text-center py-2 px-1">☁️ Tot</th>
                    <th className="text-center py-2 px-1">☁️ Bas</th>
                    <th className="text-center py-2 px-1">☁️ Haut</th>
                    <th className="text-center py-2 px-1">🌡️</th>
                    <th className="text-center py-2 px-1">💨</th>
                    <th className="text-center py-2 px-1">💦</th>
                    <th className="text-center py-2 px-1">👁️</th>
                    <th className="text-center py-2 px-1">🌫️</th>
                  </tr>
                </thead>
                <tbody>
                  {weather.map((h, i) => (
                    <tr key={i} className={`border-b ${nm ? 'border-gray-800' : 'border-gray-100'} ${h.cloudTotal < 20 ? (nm ? 'bg-green-950' : 'bg-green-50') : h.cloudTotal < 60 ? (nm ? 'bg-yellow-950' : 'bg-yellow-50') : (nm ? 'bg-red-950' : 'bg-red-50')}`}>
                      <td className={`py-2 pr-2 font-mono font-bold sticky left-0 z-10 ${nm ? 'text-red-300' : 'text-gray-700'}`} style={{ background: 'inherit' }}>
                        {String(h.hour).padStart(2, '0')}h
                      </td>
                      <td className={`text-center font-bold ${cloudColor(h.cloudTotal, nm)}`}>{h.cloudTotal}%</td>
                      <td className={`text-center ${cloudColor(h.cloudLow, nm)}`}>{h.cloudLow}%</td>
                      <td className={`text-center ${cloudColor(h.cloudHigh, nm)}`}>{h.cloudHigh}%</td>
                      <td className={`text-center ${nm ? 'text-red-200' : 'text-gray-700'}`}>{h.temp.toFixed(0)}°</td>
                      <td className={`text-center ${h.windSpeed > 30 ? 'text-red-500' : h.windSpeed > 15 ? 'text-yellow-500' : (nm ? 'text-green-400' : 'text-green-600')}`}>{h.windSpeed.toFixed(0)}</td>
                      <td className={`text-center ${h.humidity > 85 ? 'text-red-500' : h.humidity > 70 ? 'text-yellow-500' : (nm ? 'text-green-400' : 'text-green-600')}`}>{h.humidity}%</td>
                      <td className={`text-center ${h.seeing < 2 ? (nm ? 'text-green-400' : 'text-green-600') : h.seeing < 3 ? 'text-yellow-500' : 'text-red-500'}`}>{h.seeing.toFixed(1)}"</td>
                      <td className="text-center">{h.fog ? '🌫️' : '✅'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Légende */}
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              <span className={`${nm ? 'text-green-400' : 'text-green-600'}`}>🟢 &lt;20% dégagé</span>
              <span className={`${nm ? 'text-yellow-400' : 'text-yellow-600'}`}>🟡 20-60% variable</span>
              <span className={`${nm ? 'text-red-400' : 'text-red-600'}`}>🔴 &gt;60% couvert</span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // ─── TAB: MATÉRIEL ───────────────────────────────────────────────────────────
  const TabMateriel = () => {
    const camA_local = (camTypeA === 'astro' ? ASTRO_CAMERAS : DSLR_CAMERAS)[camIdxA];
    const camB_local = (camTypeB === 'dslr' ? DSLR_CAMERAS : ASTRO_CAMERAS)[camIdxB];

    return (
      <div className="space-y-4">
        {/* Toggle Mode */}
        <div className={`rounded-xl border p-4 ${card}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`font-bold ${nm ? 'text-red-200' : 'text-gray-800'}`}>
                {mountMode ? '🔭 Mode Monture' : '📷 Mode Trépied Fixe'}
              </div>
              <div className={`text-xs ${label}`}>
                {mountMode ? 'Avec suivi motorisé' : 'Sans suivi – Poses courtes'}
              </div>
            </div>
            <button onClick={() => setMountMode(m => !m)}
              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${mountMode ? 'bg-blue-600' : nm ? 'bg-gray-600' : 'bg-gray-300'}`}>
              <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow ${mountMode ? 'translate-x-9' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {mountMode ? (
          /* ── MODE A : MONTURE ── */
          <div className="space-y-4">
            {/* Monture */}
            <div className={`rounded-xl border p-4 ${card}`}>
              <h2 className={`font-bold mb-3 ${head2}`}>🏗️ Monture</h2>
              <select value={mountIdx} onChange={e => setMountIdx(Number(e.target.value))}
                className={`w-full rounded border px-2 py-2 text-sm ${select}`}>
                {MOUNTS.map((m, i) => <option key={i} value={i}>{m.name} – {m.maxLoad}kg – {m.power}W</option>)}
              </select>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center text-sm">
                <div className={`p-2 rounded ${cardInner}`}><div className={`text-xs ${label}`}>Charge max</div><div className="font-bold">{mount.maxLoad} kg</div></div>
                <div className={`p-2 rounded ${cardInner}`}><div className={`text-xs ${label}`}>Conso</div><div className="font-bold">{mount.power} W</div></div>
                <div className={`p-2 rounded ${cardInner}`}><div className={`text-xs ${label}`}>Poids</div><div className="font-bold">{mount.weight} kg</div></div>
              </div>
            </div>

            {/* Télescope */}
            <div className={`rounded-xl border p-4 ${card}`}>
              <h2 className={`font-bold mb-3 ${head2}`}>🔭 Télescope / Lunette</h2>
              <select value={scopeIdx} onChange={e => setScopeIdx(Number(e.target.value))}
                className={`w-full rounded border px-2 py-2 text-sm ${select}`}>
                {TELESCOPES.map((t, i) => <option key={i} value={i}>{t.name} – {t.focal}mm f/{(t.focal / t.diameter).toFixed(1)}</option>)}
              </select>
              <div className="mt-3">
                <label className={`text-xs ${label}`}>Réducteur / Barlow</label>
                <select value={reducerIdxA} onChange={e => setReducerIdxA(Number(e.target.value))}
                  className={`w-full rounded border px-2 py-2 text-sm mt-1 ${select}`}>
                  <option value={-1}>Aucun</option>
                  {REDUCERS.map((r, i) => <option key={i} value={i}>{r.name}</option>)}
                </select>
                {reducerA && (
                  <p className={`text-xs mt-1 ${nm ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    Focale effective : {effectiveFocalA.toFixed(0)} mm
                  </p>
                )}
              </div>
            </div>

            {/* Caméra principale */}
            <div className={`rounded-xl border p-4 ${card}`}>
              <h2 className={`font-bold mb-3 ${head2}`}>📷 Caméra Principale</h2>
              <div className="flex gap-2 mb-2">
                {(['astro', 'dslr'] as const).map(t => (
                  <button key={t} onClick={() => { setCamTypeA(t); setCamIdxA(0); }}
                    className={`flex-1 py-1.5 rounded text-sm font-medium transition ${camTypeA === t ? btnPrim : (nm ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')}`}>
                    {t === 'astro' ? '🔬 Astro' : '📷 DSLR'}
                  </button>
                ))}
              </div>
              <select value={camIdxA} onChange={e => setCamIdxA(Number(e.target.value))}
                className={`w-full rounded border px-2 py-2 text-sm ${select}`}>
                {(camTypeA === 'astro' ? ASTRO_CAMERAS : DSLR_CAMERAS).map((c, i) => (
                  <option key={i} value={i}>{c.name} – {c.pixel}µm – {c.power}W</option>
                ))}
              </select>
              {camA_local && (
                <div className={`mt-3 p-3 rounded border ${cardInner}`}>
                  <div className={`text-sm font-semibold ${nm ? 'text-red-200' : 'text-gray-700'}`}>
                    Échantillonnage : <span className={`text-lg font-bold ${nm ? 'text-yellow-400' : 'text-blue-600'}`}>{samplingA.toFixed(2)}"</span>/pixel
                  </div>
                  <div className={`text-xs ${label} mt-1`}>
                    {samplingA < 0.8 ? '⚠️ Sur-échantillonnage (focale trop longue)' :
                     samplingA > 3.0 ? '⚠️ Sous-échantillonnage (focale trop courte)' :
                     '✅ Échantillonnage idéal'}
                  </div>
                </div>
              )}
            </div>

            {/* Accessoires */}
            <div className={`rounded-xl border p-4 ${card}`}>
              <h2 className={`font-bold mb-3 ${head2}`}>🔧 Accessoires</h2>
              <div className="space-y-3">
                {/* EAF */}
                <div className={`rounded-lg p-3 border ${cardInner}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <input type="checkbox" id="eaf" checked={hasEAF} onChange={e => setHasEAF(e.target.checked)} />
                    <label htmlFor="eaf" className={`text-sm font-medium ${nm ? 'text-red-200' : 'text-gray-700'}`}>🔭 Motorisation de mise au point (EAF)</label>
                  </div>
                  {hasEAF && (
                    <select value={eafIdx} onChange={e => setEafIdx(Number(e.target.value))}
                      className={`w-full rounded border px-2 py-1.5 text-sm ${select}`}>
                      {EAF_OPTIONS.map((e, i) => <option key={i} value={i}>{e.name} – {e.weight}kg – {e.power}W</option>)}
                    </select>
                  )}
                </div>
                {/* Filtres */}
                <div className={`rounded-lg p-3 border ${cardInner}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <input type="checkbox" id="filter" checked={hasFilter} onChange={e => setHasFilter(e.target.checked)} />
                    <label htmlFor="filter" className={`text-sm font-medium ${nm ? 'text-red-200' : 'text-gray-700'}`}>🎞️ Filtre / Roue à filtres</label>
                  </div>
                  {hasFilter && (
                    <select value={filterIdx} onChange={e => setFilterIdx(Number(e.target.value))}
                      className={`w-full rounded border px-2 py-1.5 text-sm ${select}`}>
                      {FILTER_OPTIONS.map((f, i) => <option key={i} value={i}>{f.name} – {f.weight}kg – {f.power}W</option>)}
                    </select>
                  )}
                </div>
                {/* Guidage */}
                <div className={`rounded-lg p-3 border ${cardInner}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <input type="checkbox" id="gs" checked={hasGuideScope} onChange={e => setHasGuideScope(e.target.checked)} />
                    <label htmlFor="gs" className={`text-sm font-medium ${nm ? 'text-red-200' : 'text-gray-700'}`}>🔭 Lunette de guidage</label>
                  </div>
                  {hasGuideScope && (
                    <select value={guideScopeIdx} onChange={e => setGuideScopeIdx(Number(e.target.value))}
                      className={`w-full rounded border px-2 py-1.5 text-sm ${select}`}>
                      {GUIDE_SCOPES.map((g, i) => <option key={i} value={i}>{g.name} – {g.focal}mm – {g.weight}kg</option>)}
                    </select>
                  )}
                </div>
                <div className={`rounded-lg p-3 border ${cardInner}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <input type="checkbox" id="gc" checked={hasGuideCam} onChange={e => setHasGuideCam(e.target.checked)} />
                    <label htmlFor="gc" className={`text-sm font-medium ${nm ? 'text-red-200' : 'text-gray-700'}`}>📷 Caméra de guidage</label>
                  </div>
                  {hasGuideCam && (
                    <select value={guideCamIdx} onChange={e => setGuideCamIdx(Number(e.target.value))}
                      className={`w-full rounded border px-2 py-1.5 text-sm ${select}`}>
                      {GUIDE_CAMERAS.map((g, i) => <option key={i} value={i}>{g.name} – {g.pixel}µm – {g.power}W</option>)}
                    </select>
                  )}
                </div>
                {/* ASIAIR */}
                <div className={`rounded-lg p-3 border ${cardInner}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <input type="checkbox" id="asiair" checked={hasASIAIR} onChange={e => setHasASIAIR(e.target.checked)} />
                    <label htmlFor="asiair" className={`text-sm font-medium ${nm ? 'text-red-200' : 'text-gray-700'}`}>🖥️ ASIAIR / Contrôleur</label>
                  </div>
                  {hasASIAIR && (
                    <div className="space-y-2">
                      <select value={asiairIdx} onChange={e => setAsiairIdx(Number(e.target.value))}
                        className={`w-full rounded border px-2 py-1.5 text-sm ${select}`}>
                        {ASIAIR_OPTIONS.map((a, i) => <option key={i} value={i}>{a.name} – {a.power}W – {a.weight}kg</option>)}
                      </select>
                      <div className="flex gap-2">
                        {(['mount', 'tripod'] as const).map(pos => (
                          <button key={pos} onClick={() => setAsiairPos(pos)}
                            className={`flex-1 py-1 rounded text-xs font-medium ${asiairPos === pos ? btnPrim : (nm ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>
                            {pos === 'mount' ? '🔭 Sur monture' : '📐 Sur trépied'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {/* Chauffage */}
                <div className={`rounded-lg p-3 border ${cardInner}`}>
                  <div className={`text-sm font-medium mb-2 ${nm ? 'text-red-200' : 'text-gray-700'}`}>🔥 Chauffages</div>
                  <div className="space-y-2">
                    <div>
                      <label className={`text-xs ${label}`}>Optique {heaterOptPct > 0 ? `(${heaterOptPct}% = ${(12 * heaterOptPct / 100).toFixed(1)}W)` : '(OFF)'}</label>
                      <input type="range" min={0} max={100} value={heaterOptPct}
                        onChange={e => setHeaterOptPct(Number(e.target.value))}
                        className="w-full mt-1 accent-orange-500" />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="hg" checked={heaterGuide} onChange={e => setHeaterGuide(e.target.checked)} />
                      <label htmlFor="hg" className={`text-xs ${label}`}>Chauffage guidage</label>
                    </div>
                    {heaterGuide && (
                      <div>
                        <label className={`text-xs ${label}`}>Guidage {heaterGuidePct > 0 ? `(${heaterGuidePct}% = ${(6 * heaterGuidePct / 100).toFixed(1)}W)` : '(OFF)'}</label>
                        <input type="range" min={0} max={100} value={heaterGuidePct}
                          onChange={e => setHeaterGuidePct(Number(e.target.value))}
                          className="w-full mt-1 accent-orange-500" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Alimentation */}
            <div className={`rounded-xl border p-4 ${card}`}>
              <h2 className={`font-bold mb-3 ${head2}`}>🔋 Alimentation</h2>
              <div className="flex gap-2 flex-wrap mb-3">
                {[['battery', '🔋 Batterie'], ['separate', '⚡ Séparée'], ['cells', '🪫 Piles']].map(([val, lbl]) => (
                  <button key={val} onClick={() => setPowerSource(val as typeof powerSource)}
                    className={`px-3 py-1.5 rounded text-sm font-medium ${powerSource === val ? btnPrim : (nm ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')}`}>
                    {lbl}
                  </button>
                ))}
              </div>
              <select value={batteryIdx} onChange={e => setBatteryIdx(Number(e.target.value))}
                className={`w-full rounded border px-2 py-2 text-sm ${select}`}>
                {BATTERIES.map((b, i) => <option key={i} value={i}>{b.name} – {b.capacity} Wh</option>)}
              </select>
            </div>

            {/* Résumé poids & consommation */}
            <div className={`rounded-xl border p-4 ${card}`}>
              <h2 className={`font-bold mb-3 ${head2}`}>📊 Résumé Technique</h2>
              <div className="space-y-4">
                {/* Poids */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className={`text-sm font-semibold ${nm ? 'text-red-200' : 'text-gray-700'}`}>
                      ⚖️ Charge monture
                    </span>
                    <span className={`text-sm font-bold ${chargePercent > 80 ? 'text-red-500' : chargePercent > 60 ? 'text-yellow-500' : (nm ? 'text-blue-400' : 'text-blue-600')}`}>
                      {mountPayload.toFixed(2)} kg / {mount.maxLoad} kg ({chargePercent.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-gray-700 overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(chargePercent, 100)}%`, background: chargePercent > 80 ? '#ef4444' : chargePercent > 60 ? '#f59e0b' : '#3b82f6' }} />
                  </div>
                  {chargePercent > 80 && (
                    <p className="text-xs text-red-500 mt-1">⚠️ Charge critique ! Risque de vibrations et erreurs de guidage</p>
                  )}
                  {chargePercent > 60 && chargePercent <= 80 && (
                    <p className={`text-xs mt-1 ${nm ? 'text-yellow-400' : 'text-yellow-600'}`}>⚠️ Charge élevée – Guidage précis peut être difficile</p>
                  )}
                </div>
                {/* Détail poids */}
                <div className={`text-xs space-y-1 ${label}`}>
                  <div className="flex justify-between"><span>🔭 {scope.name}</span><span>{scope.weight} kg</span></div>
                  {camA && <div className="flex justify-between"><span>📷 {camA.name}</span><span>{camA.weight} kg</span></div>}
                  {hasEAF && <div className="flex justify-between"><span>🔭 {EAF_OPTIONS[eafIdx].name}</span><span>{EAF_OPTIONS[eafIdx].weight} kg</span></div>}
                  {hasFilter && <div className="flex justify-between"><span>🎞️ {FILTER_OPTIONS[filterIdx].name}</span><span>{FILTER_OPTIONS[filterIdx].weight} kg</span></div>}
                  {hasGuideScope && <div className="flex justify-between"><span>🔭 {GUIDE_SCOPES[guideScopeIdx].name}</span><span>{GUIDE_SCOPES[guideScopeIdx].weight} kg</span></div>}
                  {hasGuideCam && <div className="flex justify-between"><span>📷 {GUIDE_CAMERAS[guideCamIdx].name}</span><span>{GUIDE_CAMERAS[guideCamIdx].weight} kg</span></div>}
                  {hasASIAIR && asiairPos === 'mount' && <div className="flex justify-between"><span>🖥️ {ASIAIR_OPTIONS[asiairIdx].name}</span><span>{ASIAIR_OPTIONS[asiairIdx].weight} kg</span></div>}
                  <div className="flex justify-between"><span>🔌 Câbles</span><span>0.20 kg</span></div>
                  <div className={`flex justify-between font-bold pt-1 border-t ${nm ? 'border-gray-600 text-red-200' : 'border-gray-300 text-gray-800'}`}>
                    <span>Total sur monture</span><span>{mountPayload.toFixed(2)} kg</span>
                  </div>
                </div>
                {/* Consommation */}
                <div className={`border-t pt-3 ${nm ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className={`text-sm font-semibold mb-2 ${nm ? 'text-red-200' : 'text-gray-700'}`}>⚡ Consommation totale</div>
                  <div className={`text-xs space-y-1 ${label}`}>
                    {hasASIAIR && <div className="flex justify-between"><span>🖥️ {ASIAIR_OPTIONS[asiairIdx].name}</span><span>{ASIAIR_OPTIONS[asiairIdx].power}W</span></div>}
                    {powerSource === 'battery' && <div className="flex justify-between"><span>🏗️ {mount.name}</span><span>{mount.power}W</span></div>}
                    {camA && <div className="flex justify-between"><span>📷 Caméra principale</span><span>{camA.power}W</span></div>}
                    {hasGuideCam && <div className="flex justify-between"><span>📷 Caméra guidage</span><span>{GUIDE_CAMERAS[guideCamIdx].power}W</span></div>}
                    {hasEAF && <div className="flex justify-between"><span>🔭 EAF</span><span>{EAF_OPTIONS[eafIdx].power}W</span></div>}
                    {hasFilter && FILTER_OPTIONS[filterIdx].power > 0 && <div className="flex justify-between"><span>🎞️ Roue filtres</span><span>{FILTER_OPTIONS[filterIdx].power}W</span></div>}
                    {heaterOptPct > 0 && <div className="flex justify-between"><span>🔥 Chauffage optique</span><span>{(12 * heaterOptPct / 100).toFixed(1)}W</span></div>}
                    {heaterGuide && heaterGuidePct > 0 && <div className="flex justify-between"><span>🔥 Chauffage guidage</span><span>{(6 * heaterGuidePct / 100).toFixed(1)}W</span></div>}
                    <div className={`flex justify-between font-bold pt-1 border-t text-sm ${nm ? 'border-gray-600 text-red-200' : 'border-gray-300 text-gray-800'}`}>
                      <span>Total</span><span>{totalPower.toFixed(1)} W</span>
                    </div>
                  </div>
                  <div className={`mt-3 p-3 rounded-lg ${cardInner} text-center`}>
                    <div className={`text-xs ${label}`}>Autonomie ({battery.name})</div>
                    <div className={`text-2xl font-bold ${autonomy < 4 ? 'text-red-500' : autonomy < 6 ? 'text-yellow-500' : (nm ? 'text-green-400' : 'text-green-600')}`}>
                      {autonomy.toFixed(1)} h
                    </div>
                    <div className={`text-xs ${label}`}>(avec 85% d'efficacité)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── MODE B : TRÉPIED FIXE ── */
          <div className="space-y-4">
            <div className={`rounded-xl border p-4 ${card}`}>
              <h2 className={`font-bold mb-3 ${head2}`}>📷 Appareil Photo</h2>
              <div className="flex gap-2 mb-2">
                {(['dslr', 'astro'] as const).map(t => (
                  <button key={t} onClick={() => { setCamTypeB(t); setCamIdxB(0); }}
                    className={`flex-1 py-1.5 rounded text-sm font-medium ${camTypeB === t ? btnPrim : (nm ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')}`}>
                    {t === 'dslr' ? '📷 DSLR' : '🔬 Astro'}
                  </button>
                ))}
              </div>
              <select value={camIdxB} onChange={e => setCamIdxB(Number(e.target.value))}
                className={`w-full rounded border px-2 py-2 text-sm ${select}`}>
                {(camTypeB === 'dslr' ? DSLR_CAMERAS : ASTRO_CAMERAS).map((c, i) => (
                  <option key={i} value={i}>{c.name} – {c.pixel}µm</option>
                ))}
              </select>
              {camB_local && camTypeB === 'dslr' && (
                <div className={`mt-2 text-xs ${label}`}>Format : {(DSLR_CAMERAS[camIdxB] as typeof DSLR_CAMERAS[0]).format}</div>
              )}
            </div>

            <div className={`rounded-xl border p-4 ${card}`}>
              <h2 className={`font-bold mb-3 ${head2}`}>🔍 Objectif</h2>
              <select value={lensIdxB} onChange={e => setLensIdxB(Number(e.target.value))}
                className={`w-full rounded border px-2 py-2 text-sm ${select}`}>
                {LENSES.map((l, i) => <option key={i} value={i}>{l.name} – {l.focal}mm</option>)}
              </select>
              <div className="mt-2">
                <label className={`text-xs ${label}`}>Réducteur</label>
                <select value={reducerIdxB} onChange={e => setReducerIdxB(Number(e.target.value))}
                  className={`w-full rounded border px-2 py-1.5 text-sm mt-1 ${select}`}>
                  <option value={-1}>Aucun</option>
                  {REDUCERS.map((r, i) => <option key={i} value={i}>{r.name}</option>)}
                </select>
              </div>
            </div>

            {/* Règle 500/300/200 */}
            <div className={`rounded-xl border p-4 ${card}`}>
              <h2 className={`font-bold mb-3 ${head2}`}>⏱️ Règle 500/300/200</h2>
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${cardInner} text-center`}>
                  <div className={`text-xs ${label}`}>Format capteur → Règle appliquée</div>
                  <div className={`text-3xl font-black ${nm ? 'text-yellow-400' : 'text-blue-600'}`}>{ruleB}</div>
                  <div className={`text-xs ${label}`}>{formatB}</div>
                </div>
                <div className={`p-3 rounded-lg ${cardInner} text-center`}>
                  <div className={`text-xs ${label}`}>Focale effective</div>
                  <div className={`text-2xl font-bold ${nm ? 'text-red-200' : 'text-gray-800'}`}>{effectiveFocalB} mm</div>
                </div>
                <div className={`p-4 rounded-lg text-center border-2 ${maxExpB > 0 ? (nm ? 'border-green-700 bg-green-950' : 'border-green-300 bg-green-50') : cardInner}`}>
                  <div className={`text-xs ${label}`}>Temps max sans filé</div>
                  <div className={`text-4xl font-black ${nm ? 'text-green-400' : 'text-green-600'}`}>{maxExpB > 0 ? `${maxExpB}s` : '--'}</div>
                </div>
                <div>
                  <label className={`text-xs ${label}`}>Temps de pose saisi (secondes)</label>
                  <input type="number" value={exposureTimeB} onChange={e => setExposureTimeB(Number(e.target.value))}
                    className={`w-full rounded border px-2 py-2 text-sm mt-1 ${input}`} />
                  {exposureTimeB > maxExpB && maxExpB > 0 && (
                    <div className="mt-2 p-2 bg-red-600 rounded text-white text-sm font-semibold text-center">
                      ⚠️ FILÉ STELLAIRE ! {exposureTimeB}s &gt; {maxExpB}s max
                    </div>
                  )}
                  {exposureTimeB <= maxExpB && maxExpB > 0 && (
                    <div className="mt-2 p-2 bg-green-600 rounded text-white text-sm font-semibold text-center">
                      ✅ Durée correcte ({exposureTimeB}s ≤ {maxExpB}s)
                    </div>
                  )}
                </div>
                {moonInfo.illumination > 50 && (
                  <div className={`p-3 rounded-lg border ${nm ? 'bg-yellow-950 border-yellow-800' : 'bg-yellow-50 border-yellow-200'}`}>
                    <div className={`text-sm font-semibold ${nm ? 'text-yellow-400' : 'text-yellow-700'}`}>
                      🌕 Lune à {moonInfo.illumination}% – Azimut {moonInfo.azimuth.toFixed(0)}° ({compassDir(moonInfo.azimuth)})
                    </div>
                    <div className={`text-xs mt-1 ${label}`}>
                      Pointez vers {compassDir(parseFloat(moonOppAz))} ({moonOppAz}°) pour éviter le voile lunaire
                    </div>
                  </div>
                )}
                <div>
                  <label className={`text-xs ${label}`}>ISO</label>
                  <select value={isoB} onChange={e => setIsoB(Number(e.target.value))}
                    className={`w-full rounded border px-2 py-1.5 text-sm mt-1 ${select}`}>
                    {[400, 800, 1600, 3200, 6400, 12800].map(iso => <option key={iso} value={iso}>ISO {iso}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── TAB: ASIAIR / GUIDAGE ───────────────────────────────────────────────────
  const TabASIAIR = () => {
    const diagnosis = getDiagnosis();
    return (
      <div className="space-y-4">
        {/* Paramètres calculés */}
        <div className={`rounded-xl border p-4 ${card}`}>
          <h2 className={`font-bold mb-3 ${head2}`}>🔢 Paramètres Automatiques</h2>
          {(!hasGuideScope || !hasGuideCam) ? (
            <div className={`text-sm ${label} p-3 rounded ${cardInner}`}>
              ⚠️ Configurez une lunette + caméra de guidage dans l'onglet Matériel
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Focale guidescope', value: `${GUIDE_SCOPES[guideScopeIdx].focal} mm` },
                { label: 'Pixel cam. guidage', value: `${GUIDE_CAMERAS[guideCamIdx].pixel} µm` },
                { label: 'Échelle de guidage', value: `${guideScale.toFixed(2)}" /px` },
                { label: 'Seeing estimé', value: weather.length > 0 ? `${weather[0].seeing.toFixed(1)}"` : '--' },
              ].map(({ label: l, value }) => (
                <div key={l} className={`p-3 rounded-lg border ${cardInner}`}>
                  <div className={`text-xs ${label}`}>{l}</div>
                  <div className={`font-bold ${nm ? 'text-yellow-400' : 'text-blue-600'}`}>{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Réglages utilisateur */}
        <div className={`rounded-xl border p-4 ${card}`}>
          <h2 className={`font-bold mb-3 ${head2}`}>🎛️ Réglages ASIAIR</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`text-xs ${label}`}>Guide Rate</label>
                <select value={guideRate} onChange={e => setGuideRate(Number(e.target.value))}
                  className={`w-full rounded border px-2 py-2 text-sm mt-1 ${select}`}>
                  {[0.25, 0.5, 0.75, 1.0].map(r => <option key={r} value={r}>{r}x</option>)}
                </select>
              </div>
              <div>
                <label className={`text-xs ${label}`}>Exposition guidage</label>
                <select value={guideExp} onChange={e => setGuideExp(Number(e.target.value))}
                  className={`w-full rounded border px-2 py-2 text-sm mt-1 ${select}`}>
                  {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0].map(e => <option key={e} value={e}>{e}s</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={`text-xs ${label}`}>Agressivité RA : <span className="font-bold">{aggroRA}%</span></label>
              <input type="range" min={0} max={100} value={aggroRA} onChange={e => setAggroRA(Number(e.target.value))}
                className="w-full mt-1 accent-blue-500" />
            </div>
            <div>
              <label className={`text-xs ${label}`}>Agressivité DEC : <span className="font-bold">{aggroDEC}%</span></label>
              <input type="range" min={0} max={100} value={aggroDEC} onChange={e => setAggroDEC(Number(e.target.value))}
                className="w-full mt-1 accent-red-500" />
            </div>
            <div>
              <label className={`text-xs ${label}`}>Min-Move (arcsec)</label>
              <div className="flex gap-2 mt-1">
                <input type="number" step={0.01} value={minMove} onChange={e => setMinMove(Number(e.target.value))}
                  className={`flex-1 rounded border px-2 py-1.5 text-sm ${input}`} />
                <button onClick={() => setMinMove(minMoveCalc)}
                  className={`px-3 py-1 rounded text-sm ${btnPrim}`}>Auto ({minMoveCalc}")</button>
              </div>
            </div>
          </div>
        </div>

        {/* Valeurs de calibration */}
        <div className={`rounded-xl border p-4 ${card}`}>
          <h2 className={`font-bold mb-3 ${head2}`}>📐 Calibration (12 steps)</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Step Size', value: `${stepSize} ms` },
                { label: 'Max RA Duration', value: `${maxRADur} ms` },
                { label: 'Max DEC Duration', value: `${maxDECDur} ms` },
              ].map(({ label: l, value }) => (
                <div key={l} className={`p-3 rounded-lg border text-center ${cardInner}`}>
                  <div className={`text-xs ${label}`}>{l}</div>
                  <div className={`font-bold text-sm ${nm ? 'text-yellow-400' : 'text-blue-600'}`}>{value}</div>
                </div>
              ))}
            </div>
            <div>
              <label className={`text-xs ${label}`}>Step size mesuré (ms)</label>
              <input type="text" placeholder="Ex: 1250" value={stepMeasured}
                onChange={e => setStepMeasured(e.target.value)}
                className={`w-full rounded border px-2 py-1.5 text-sm mt-1 ${input}`} />
            </div>
          </div>
        </div>

        {/* Tableau réglages */}
        <div className={`rounded-xl border p-4 ${card}`}>
          <h2 className={`font-bold mb-3 ${head2}`}>📋 Tableau Réglages ASIAIR</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${nm ? 'border-gray-700' : 'border-gray-200'}`}>
                  <th className={`text-left py-2 ${label}`}>Réglage</th>
                  <th className={`text-right py-2 ${label}`}>Valeur</th>
                </tr>
              </thead>
              <tbody className="space-y-1">
                {[
                  ['Calibration steps', '12'],
                  ['Agressivité RA', `${aggroRA}%`],
                  ['Agressivité DEC', `${aggroDEC}%`],
                  ['Min-Move RA/DEC', `${minMove.toFixed(2)}"`],
                  ['Max RA Duration', `${maxRADur} ms`],
                  ['Max DEC Duration', `${maxDECDur} ms`],
                  ['Guide Rate', `${guideRate}x`],
                  ['Exposition guide', `${guideExp}s`],
                  ['Step size calculé', `${stepSize} ms`],
                  ['Step size mesuré', stepMeasured || '—'],
                ].map(([k, v]) => (
                  <tr key={k} className={`border-b ${nm ? 'border-gray-800' : 'border-gray-100'}`}>
                    <td className={`py-1.5 ${nm ? 'text-red-200' : 'text-gray-700'}`}>{k}</td>
                    <td className={`py-1.5 text-right font-mono font-bold ${nm ? 'text-yellow-400' : 'text-blue-600'}`}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Graphique guidage */}
        <div className={`rounded-xl border p-4 ${card}`}>
          <h2 className={`font-bold mb-3 ${head2}`}>📈 Graphique de Suivi</h2>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: 'Erreur RA (arcsec)', val: errorRA, set: setErrorRA },
              { label: 'Erreur DEC (arcsec)', val: errorDEC, set: setErrorDEC },
              { label: 'RMS Total (arcsec)', val: rmsTotal, set: setRmsTotal },
            ].map(({ label: l, val, set }) => (
              <div key={l}>
                <label className={`text-xs ${label}`}>{l}</label>
                <input type="number" step={0.1} min={0} max={5} value={val}
                  onChange={e => set(e.target.value)}
                  placeholder="0.0"
                  className={`w-full rounded border px-2 py-1.5 text-sm mt-1 ${input}`} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mb-3">
            <button onClick={applyGuideGraph} className={`flex-1 py-2 rounded font-medium text-sm ${btnPrim}`}>
              ▶ Appliquer
            </button>
            <button onClick={() => { setGuidePoints({ ra: [], dec: [] }); setErrorRA(''); setErrorDEC(''); setRmsTotal(''); }}
              className={`px-4 py-2 rounded text-sm ${nm ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              ↺ Reset
            </button>
          </div>
          <GuideGraph />
        </div>

        {/* Diagnostic */}
        <div className={`rounded-xl border p-4 ${card}`}>
          <h2 className={`font-bold mb-3 ${head2}`}>🔍 Diagnostic Automatique</h2>
          {diagnosis.length === 0 ? (
            <p className={`text-sm ${label}`}>Saisissez les erreurs RA/DEC/RMS pour obtenir un diagnostic</p>
          ) : (
            <div className="space-y-2">
              {diagnosis.map((d, i) => (
                <div key={i} className={`p-3 rounded-lg border text-sm ${d.startsWith('✅') ? (nm ? 'border-green-800 bg-green-950 text-green-400' : 'border-green-200 bg-green-50 text-green-700') : d.startsWith('👍') ? (nm ? 'border-blue-800 bg-blue-950 text-blue-400' : 'border-blue-100 bg-blue-50 text-blue-700') : (nm ? 'border-yellow-800 bg-yellow-950 text-yellow-400' : 'border-yellow-100 bg-yellow-50 text-yellow-700')}`}>
                  {d}
                </div>
              ))}
            </div>
          )}
          {/* Tableau de référence */}
          <div className={`mt-4 text-xs ${label}`}>
            <div className={`font-semibold mb-2 ${nm ? 'text-red-200' : 'text-gray-700'}`}>Référence rapide</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
                <thead>
                  <tr className={`border-b ${nm ? 'border-gray-700' : 'border-gray-200'}`}>
                    <th className="text-left py-1">Condition</th>
                    <th className="text-left py-1 pl-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['RA > 1.0" et DEC > 1.0"', 'Vérifiez mise en station et équilibrage'],
                    ['RA > 1.0" et DEC < 0.8"', 'Augmentez agressivité RA de 5-10%'],
                    ['RA < 0.8" et DEC > 1.0"', 'Vérifiez backlash DEC'],
                    ['RA oscillante', 'Réduisez agressivité RA de 5%'],
                    ['DEC oscillante', 'Vérifiez backlash ou réduisez agressivité DEC'],
                    ['RA > 1.5"', 'Vérifiez courroie/tangente et équilibrage'],
                    ['RMS < 0.5"', '✅ Excellent guidage !'],
                    ['RMS 0.5-0.8"', '👍 Bon guidage, peut être amélioré'],
                    ['RMS > 0.8"', '⚠️ Guidage médiocre → recalibrez'],
                  ].map(([cond, action]) => (
                    <tr key={cond} className={`border-b ${nm ? 'border-gray-800' : 'border-gray-100'}`}>
                      <td className={`py-1 pr-4 font-mono ${nm ? 'text-red-300' : 'text-gray-600'}`}>{cond}</td>
                      <td className={`py-1 pl-4 ${nm ? 'text-gray-400' : 'text-gray-500'}`}>{action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── TAB: CALCULS ────────────────────────────────────────────────────────────
  const TabCalculs = () => (
    <div className="space-y-4">
      {/* Planification poses */}
      <div className={`rounded-xl border p-4 ${card}`}>
        <h2 className={`font-bold mb-3 ${head2}`}>📸 Planification des Poses</h2>
        <div className="space-y-3">
          <div>
            <label className={`text-xs ${label}`}>Temps de pose (secondes)</label>
            <input type="number" value={poseTime} onChange={e => setPoseTime(Number(e.target.value))}
              className={`w-full rounded border px-2 py-2 text-sm mt-1 ${input}`} />
          </div>
          {/* Boutons rapides */}
          <div className="flex flex-wrap gap-2">
            {[30, 60, 120, 180, 300, 600].map(t => (
              <button key={t} onClick={() => setPoseTime(t)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${poseTime === t ? btnPrim : (nm ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}`}>
                {t >= 60 ? `${t / 60}min` : `${t}s`}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-lg border text-center ${cardInner}`}>
              <div className={`text-xs ${label}`}>Poses par heure</div>
              <div className={`text-2xl font-bold ${nm ? 'text-yellow-400' : 'text-blue-600'}`}>{posesPerHour}</div>
            </div>
            <div className={`p-3 rounded-lg border text-center ${cardInner}`}>
              <div className={`text-xs ${label}`}>Heures TOP ({weather.length > 0 ? 'depuis météo' : 'estimé'})</div>
              <div className={`text-2xl font-bold ${nm ? 'text-green-400' : 'text-green-600'}`}>{goodHours}h</div>
            </div>
          </div>
          <div className={`p-4 rounded-lg border text-center ${cardInner}`}>
            <div className={`text-xs ${label}`}>Total poses par nuit (ciels dégagés)</div>
            <div className={`text-4xl font-black ${nm ? 'text-red-300' : 'text-blue-700'}`}>{posesPerNight}</div>
            <div className={`text-xs mt-1 ${label}`}>
              {poseTime > 0 ? `${(posesPerNight * poseTime / 3600).toFixed(1)}h d'intégration` : '--'}
            </div>
          </div>
          {!mountMode && maxExpB > 0 && exposureTimeB > maxExpB && (
            <div className="p-3 bg-red-600 rounded-lg text-white text-sm font-semibold text-center">
              ⚠️ Mode Trépied : {exposureTimeB}s &gt; {maxExpB}s max (filé stellaire !)
            </div>
          )}
        </div>
      </div>

      {/* Récapitulatif technique */}
      <div className={`rounded-xl border p-4 ${card}`}>
        <h2 className={`font-bold mb-3 ${head2}`}>🔭 Récapitulatif Optique</h2>
        {mountMode ? (
          <div className="space-y-2">
            {[
              ['Télescope', scope.name],
              ['Focale', `${scope.focal} mm`],
              ['Ouverture', `f/${(scope.focal / scope.diameter).toFixed(1)}`],
              ['Diamètre', `${scope.diameter} mm`],
              ...(reducerA ? [['Réducteur', `×${reducerA.factor} → ${effectiveFocalA.toFixed(0)} mm`]] : []),
              ...(camTypeA !== null && camA ? [['Pixel', `${camA.pixel} µm`]] : []),
              ['Échantillonnage', `${samplingA.toFixed(2)} "/pixel`],
              ['Résolution', samplingA < 0.8 ? '⚠️ Sur-éch.' : samplingA > 3 ? '⚠️ Sous-éch.' : '✅ Idéal'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className={label}>{k}</span>
                <span className={`font-medium ${nm ? 'text-red-200' : 'text-gray-700'}`}>{v}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {[
              ['Objectif', lensB?.name || '--'],
              ['Focale', `${effectiveFocalB} mm`],
              ['Format', formatB],
              ['Règle appliquée', String(ruleB)],
              ['Temps max', maxExpB > 0 ? `${maxExpB}s` : '--'],
              ['Temps saisi', `${exposureTimeB}s`],
              ['Statut', exposureTimeB > maxExpB && maxExpB > 0 ? '⚠️ Filé !' : '✅ OK'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className={label}>{k}</span>
                <span className={`font-medium ${nm ? 'text-red-200' : 'text-gray-700'}`}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Champ de vision (FOV) */}
      {mountMode && camA && (
        <div className={`rounded-xl border p-4 ${card}`}>
          <h2 className={`font-bold mb-3 ${head2}`}>📐 Champ de Vision (FOV)</h2>
          <div className={`text-xs ${label} mb-3`}>Capteur = caméra astro (approximation basée sur le nombre de pixels)</div>
          {[
            { label: 'Astro 4/3 (≈4096×3072 px)', w: 4096, h: 3072 },
            { label: 'Astro 1" (≈2048×1536 px)', w: 2048, h: 1536 },
          ].map(({ label: l, w, h }) => {
            const fovW = ((camA.pixel * w) / effectiveFocalA) * 206.265 / 3600;
            const fovH = ((camA.pixel * h) / effectiveFocalA) * 206.265 / 3600;
            return (
              <div key={l} className={`p-3 rounded-lg mb-2 border ${cardInner}`}>
                <div className={`text-xs ${label} mb-1`}>{l}</div>
                <div className={`font-bold ${nm ? 'text-yellow-400' : 'text-blue-600'}`}>
                  {fovW.toFixed(2)}° × {fovH.toFixed(2)}°
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Résumé nuit */}
      <div className={`rounded-xl border p-4 ${card}`}>
        <h2 className={`font-bold mb-3 ${head2}`}>🌙 Résumé de la Nuit</h2>
        <div className="space-y-2 text-sm">
          {[
            ['📍 Localisation', gps ? gps.city : 'Non définie'],
            ['⭐ Bortle', `${bortle} – ${BORTLE_DESC[bortle].split(' – ')[0]}`],
            ['☀️ KP Index', `${kpData.kp.toFixed(1)} (${kpData.source})`],
            ['🌙 Nuit astro', nightInfo.start ? `${fmtTime(nightInfo.start)} → ${fmtTime(nightInfo.end)} (${nightInfo.durationH.toFixed(1)}h)` : 'N/A'],
            ['🌕 Lune', `${moonInfo.phaseName} – ${moonInfo.illumination}%`],
            ['🌑 Impact', moonInfo.illumination > 50 ? `Élevé – Shootez vers ${compassDir(parseFloat(moonOppAz))}` : 'Faible'],
            ['📸 Poses plannées', posesPerNight > 0 ? `${posesPerNight} × ${poseTime}s` : '--'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className={label}>{k}</span>
              <span className={`font-medium ${nm ? 'text-red-200' : 'text-gray-700'}`}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${bg} flex flex-col`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 border-b shadow-sm ${nm ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔭</span>
            <div>
              <h1 className={`text-lg font-black tracking-tight ${nm ? 'text-red-300' : 'text-gray-900'}`}>AstroHelper</h1>
              <p className={`text-xs ${label}`}>{gps ? gps.city : 'Assistant Astrophotographie'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Mode nuit toggle */}
            <button onClick={() => setNightMode(n => !n)}
              title={nm ? 'Mode jour' : 'Mode nuit'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${nm ? 'bg-red-900 text-red-300 border border-red-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {nm ? '🔴 Nuit' : '🌙 Nuit'}
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 pb-24">
        {activeTab === 'night' && <TabNight />}
        {activeTab === 'meteo' && <TabMeteo />}
        {activeTab === 'materiel' && <TabMateriel />}
        {activeTab === 'asiair' && <TabASIAIR />}
        {activeTab === 'calculs' && <TabCalculs />}
      </main>

      {/* Bottom Nav */}
      <nav className={`fixed bottom-0 left-0 right-0 border-t z-50 ${tabBar}`}>
        <div className="max-w-2xl mx-auto flex">
          {([
            { id: 'night', icon: '🌙', label: 'Nuit' },
            { id: 'meteo', icon: '🌤️', label: 'Météo' },
            { id: 'materiel', icon: '🔭', label: 'Matériel' },
            { id: 'asiair', icon: '🖥️', label: 'ASIAIR' },
            { id: 'calculs', icon: '📊', label: 'Calculs' },
          ] as const).map(({ id, icon, label: tabLabel }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-medium border-t-2 transition-colors ${activeTab === id ? tabActive : `border-transparent ${tabInactive}`}`}>
              <span className="text-lg leading-none">{icon}</span>
              <span>{tabLabel}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
