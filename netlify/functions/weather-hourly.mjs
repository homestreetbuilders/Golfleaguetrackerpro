function asNum(v) {
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

function weatherLabel(code) {
  const c = Number(code)
  if (!Number.isFinite(c)) return '—'
  if (c === 0) return 'Clear'
  if (c === 1 || c === 2) return 'Partly cloudy'
  if (c === 3) return 'Overcast'
  if (c === 45 || c === 48) return 'Fog'
  if (c === 51 || c === 53 || c === 55) return 'Drizzle'
  if (c === 56 || c === 57) return 'Freezing drizzle'
  if (c === 61 || c === 63 || c === 65) return 'Rain'
  if (c === 66 || c === 67) return 'Freezing rain'
  if (c === 71 || c === 73 || c === 75) return 'Snow'
  if (c === 77) return 'Snow grains'
  if (c === 80 || c === 81 || c === 82) return 'Rain showers'
  if (c === 85 || c === 86) return 'Snow showers'
  if (c === 95) return 'Thunderstorm'
  if (c === 96 || c === 99) return 'Thunderstorm w/ hail'
  return '—'
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || String(res.status))
  }
  return await res.json()
}

export default async (req) => {
  const url = new URL(req.url)

  const name = String(url.searchParams.get('name') || '').trim()
  const address = String(url.searchParams.get('address') || '').trim()

  let lat = asNum(url.searchParams.get('lat'))
  let lon = asNum(url.searchParams.get('lon'))

  if (lat === null || lon === null) {
    const q = address || name
    if (!q) {
      return new Response('Missing location', { status: 400 })
    }
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`
    const geo = await fetchJson(geoUrl)
    const hit = geo && Array.isArray(geo.results) && geo.results[0] ? geo.results[0] : null
    if (!hit || hit.latitude === undefined || hit.longitude === undefined) {
      return new Response('Geocode failed', { status: 404 })
    }
    lat = asNum(hit.latitude)
    lon = asNum(hit.longitude)
  }

  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&hourly=temperature_2m,weather_code,wind_speed_10m,precipitation_probability&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`
  const forecast = await fetchJson(forecastUrl)

  const hourly = forecast && forecast.hourly ? forecast.hourly : null
  const times = hourly && Array.isArray(hourly.time) ? hourly.time : []

  // Find index closest to current time if provided
  const cur = forecast && forecast.current ? forecast.current : null
  const curTime = cur && cur.time ? String(cur.time) : null
  let startIdx = 0
  if (curTime && times.length) {
    const found = times.findIndex(t => String(t) === curTime)
    if (found >= 0) startIdx = found
    else {
      // fallback: first time >= curTime
      const ge = times.findIndex(t => String(t) >= curTime)
      if (ge >= 0) startIdx = ge
    }
  }

  const toF = (c) => (c === null || c === undefined) ? null : (Number(c) * 9 / 5 + 32)
  const toMph = (kph) => (kph === null || kph === undefined) ? null : (Number(kph) * 0.621371)

  const outHours = []
  for (let i = startIdx; i < times.length && outHours.length < 6; i++) {
    const t = times[i]
    const tempC = hourly && hourly.temperature_2m ? hourly.temperature_2m[i] : null
    const code = hourly && hourly.weather_code ? hourly.weather_code[i] : null
    const windKph = hourly && hourly.wind_speed_10m ? hourly.wind_speed_10m[i] : null
    const precip = hourly && hourly.precipitation_probability ? hourly.precipitation_probability[i] : null

    outHours.push({
      time: t,
      summary: weatherLabel(code),
      weatherCode: code === null || code === undefined ? null : Number(code),
      tempF: toF(tempC),
      windMph: toMph(windKph),
      precipProb: precip === null || precip === undefined ? null : Number(precip)
    })
  }

  return Response.json({
    location: {
      name: name || null,
      latitude: lat,
      longitude: lon,
      timezone: forecast && forecast.timezone ? forecast.timezone : null
    },
    hours: outHours
  })
}

export const config = {
  path: '/api/weather-hourly'
}
