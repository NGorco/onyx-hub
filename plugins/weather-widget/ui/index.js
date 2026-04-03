const { createElement: h, useState, useEffect } = window.React;

const WMO_ICONS = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '🌨️', 75: '❄️',
  80: '🌦️', 81: '🌧️', 82: '⛈️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

export default function WeatherWidget({ sdk }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetch('/api/plugins/weather-widget/data')
      .then(r => r.json())
      .then(setData)
      .catch(e => setErr(e.message));
  }, []);

  if (err) return h('p', { className: 'text-red-500 text-sm' }, 'Failed: ' + err);
  if (!data) return h('p', { className: 'text-gray-400 text-sm' }, 'Loading...');

  const cc = data.current_condition?.[0];
  const area = data.nearest_area?.[0];
  const location = [
    area?.areaName?.[0]?.value,
    area?.country?.[0]?.value,
  ].filter(Boolean).join(', ');

  return h('div', { className: 'flex flex-col gap-2' },
    h('div', { className: 'flex items-center gap-3' },
      h('span', { className: 'text-4xl' }, '🌡️'),
      h('div', null,
        h('div', { className: 'text-3xl font-bold' }, cc.temp_C + '°C'),
        h('div', { className: 'text-sm text-gray-500' }, cc.weatherDesc?.[0]?.value),
      ),
    ),
    h('div', { className: 'grid grid-cols-2 gap-2 text-sm text-gray-600 mt-1' },
      h('div', null, '💧 ' + cc.humidity + '% humidity'),
      h('div', null, '💨 ' + cc.windspeedKmph + ' km/h'),
      h('div', null, '👁️ ' + cc.visibility + ' km visibility'),
      h('div', null, '🌡️ Feels ' + cc.FeelsLikeC + '°C'),
    ),
    location && h('div', { className: 'text-xs text-gray-400 mt-1' }, '📍 ' + location),
  );
}
