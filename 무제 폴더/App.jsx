// App.jsx — S-Forecast ver.2.7 (12시간 실시간)
import React, { useEffect, useState } from "react";
import "./App.css";

export default function App() {
  const API_KEY = "8370f7e693e34a79bdd180327252510";

  const CITY = {
    서울:   { name_en: "Seoul",      lat: 37.5665, lon: 126.9780, alt: 20 },
    수원:   { name_en: "Suwon",      lat: 37.2636, lon: 127.0286, alt: 30 },
    용인:   { name_en: "Yongin",     lat: 37.2753, lon: 127.1159, alt: 70 },
    안산:   { name_en: "Ansan",      lat: 37.3219, lon: 126.8309, alt: 15 },
    안양:   { name_en: "Anyang",     lat: 37.3943, lon: 126.9568, alt: 25 },
    강릉:   { name_en: "Gangneung",  lat: 37.7519, lon: 128.8761, alt: 50 },
    부산:   { name_en: "Busan",      lat: 35.1796, lon: 129.0756, alt: 5 },
    오사카: { name_en: "Osaka",      lat: 34.6937, lon: 135.5023, alt: 10 },
    후쿠오카:{ name_en: "Fukuoka",   lat: 33.5902, lon: 130.4017, alt: 20 },
    유후인: { name_en: "Yufuin",     lat: 33.2659, lon: 131.3461, alt: 150 },
    나고야: { name_en: "Nagoya",     lat: 35.1815, lon: 136.9066, alt: 15 },
    마쓰야마:{ name_en: "Matsuyama", lat: 33.8393, lon: 132.7657, alt: 30 },
  };

  const CITY_NAMES = Object.keys(CITY);
  const [city, setCity] = useState("수원");
  const [current, setCurrent] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [status, setStatus] = useState("로딩 중…");

  const WEEK = ["일","월","화","수","목","금","토"];
  const dayStr = (iso) => {
    const d = new Date(iso);
    const base = d.toLocaleDateString("ko-KR",{month:"short",day:"numeric"});
    return `${base} (${WEEK[d.getDay()]})`;
  };

  function microgrid(lat, lon, d = 0.03) {
    return [
      { lat, lon },
      { lat: lat + d, lon },
      { lat: lat - d, lon },
    ];
  }

  function computeS({ temp, humidity, wind = 0, cloud = 0, lat = 35, alt = 0 }) {
    const t = (temp - 15) / 12;
    const h = (humidity - 60) / 20;
    const w = (wind - 10) / 10;
    const c = (cloud - 50) / 50;
    const diurnal = Math.sin(temp / 7) * 0.6;
    const interact = 0.4 * h * c + 0.25 * w * c;
    let s = Math.abs(0.9*diurnal + 0.7*h + 0.5*c + 0.4*w + interact);
    s *= (1 - alt/1000*0.05) * (1 + 0.002 * (lat - 35));
    return Math.min(3, s * 1.2);
  }

  function labelFromS(S, isDaily=false) {
    if (!isDaily) {
      if (S<0.4) return "맑음";
      if (S<0.75) return "흐림";
      return "비";
    }
    if (S<0.30) return "맑음";
    if (S<0.45) return "대체로 맑음";
    if (S<0.60) return "가끔 구름 많음";
    if (S<0.75) return "대체로 흐림";
    if (S<0.90) return "비 또는 소나기";
    return "비 또는 천둥";
  }

  function rainCorrection(rain, chance) {
    if (rain < 0.1 && chance < 10) return 0; // UI에서만 “비 가능성 거의 없음” 처리
    return rain;
  }

  async function fetchPoint(lat, lon) {
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${lat.toFixed(4)},${lon.toFixed(4)}&days=7&aqi=no&alerts=no&lang=ko`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API status ${res.status}`);
    const data = await res.json();
    if (!data?.location) throw new Error("Invalid location data");
    return data;
  }

  function mergeHourly(pointDatas) {
    const key = pointDatas[0].forecast.forecastday[0].hour.map(h=>h.time);
    return key.map((t, idx) => {
      const slice = pointDatas.map(d => d.forecast.forecastday[0].hour[idx]);
      const avg = (k) => slice.reduce((a,b)=>a+(b?.[k]??0),0)/slice.length;
      return {
        time: t,
        temp_c: avg("temp_c"),
        humidity: avg("humidity"),
        wind_kph: avg("wind_kph"),
        cloud: avg("cloud"),
        precip_mm: avg("precip_mm"),
        chance_of_rain: avg("chance_of_rain"),
      };
    });
  }

  const smooth = (arr, key) =>
    arr.map((v,i) => {
      const prev = arr[i-1]?.[key] ?? v[key];
      const next = arr[i+1]?.[key] ?? v[key];
      return (prev + v[key] + next) / 3;
    });

  function mergeDaily(pointDatas) {
    const days = pointDatas[0].forecast.forecastday.length;
    const out = [];
    for (let i=0;i<days;i++){
      const items = pointDatas.map(d=>d.forecast.forecastday[i]);
      const avgDay = (k) => items.reduce((a,b)=>a+(b.day?.[k]??0),0)/items.length;
      out.push({
        date: items[0].date,
        day: {
          avgtemp_c: avgDay("avgtemp_c"),
          maxtemp_c: avgDay("maxtemp_c"),
          mintemp_c: avgDay("mintemp_c"),
          avghumidity: avgDay("avghumidity"),
          maxwind_kph: avgDay("maxwind_kph"),
          totalprecip_mm: avgDay("totalprecip_mm"),
          condition: items[0].day.condition,
        },
      });
    }
    return out;
  }

  function summarizeRhythm(days, lat, alt){
    if (!days?.length) return "데이터 없음";
    const Smean = days.reduce((a,d)=>{
      const T=d.day.avgtemp_c, H=d.day.avghumidity, W=d.day.maxwind_kph, C=50;
      return a + computeS({temp:T, humidity:H, wind:W, cloud:C, lat, alt});
    },0)/days.length;
    if (Smean<0.35) return "안정 — 대체로 맑음";
    if (Smean<0.55) return "평형 — 구름 많음";
    if (Smean<0.85) return "불안정 — 한때 소나기";
    return "활성 — 흐림 또는 비";
  }

  async function fetchWeather(cityKo) {
    try {
      const { name_en, lat, lon, alt } = CITY[cityKo];
      const points = microgrid(lat, lon);
      const datas = await Promise.all(points.map(p => fetchPoint(p.lat, p.lon)));

      const localNow = new Date(datas[0].location.localtime);
      const nowH = localNow.getHours();

      let hourlyMerged = mergeHourly(datas);
      const temps = smooth(hourlyMerged, "temp_c");
      const hums  = smooth(hourlyMerged, "humidity");

      // --- 12시간 실시간 ---
      const next12 = hourlyMerged.filter(h=>{
        const hh = new Date(h.time.replace(" ","T")).getHours();
        const diff = (hh - nowH + 24) % 24;
        return diff >= 0 && diff < 12;
      }).map((h,i) => {
        const S = computeS({ temp:temps[i], humidity:hums[i], wind:h.wind_kph??0, cloud:h.cloud??0, lat, alt });
        const rain = rainCorrection(h.precip_mm ?? 0, h.chance_of_rain ?? 0);
        let condition = labelFromS(S,false);
        if (rain === 0 && h.precip_mm > 0) {
          condition = "대체로 흐림 (비 가능성 거의 없음)";
        } else if (rain > 0) {
          condition = "비";
        }
        return { time: h.time.slice(-5), temp: h.temp_c, humidity: h.humidity, condition };
      });

      const daysMerged = mergeDaily(datas);
      const curr = {
        temp_c:    datas.reduce((a,d)=>a+(d.current?.temp_c??0),0)/datas.length,
        humidity:  datas.reduce((a,d)=>a+(d.current?.humidity??0),0)/datas.length,
        condition: datas[0].current?.condition,
        last_updated: datas[0].current?.last_updated,
        city_en: name_en,
      };

      setHourly(next12);
      setForecast(daysMerged);
      setCurrent(curr);
      setStatus(summarizeRhythm(daysMerged, lat, alt));
    } catch (e) {
      console.error("Weather fetch error for", cityKo, e.message);
      setHourly([]); setForecast([]); setCurrent(null);
      setStatus(`데이터 불러오기 실패 (${cityKo})`);
    }
  }

  useEffect(()=>{ fetchWeather(city); },[city]);

  return (
    <div className="App">
      <h1>S-Forecast ver.2.7</h1>

      <div className="selector">
        <label>도시 선택: </label>
        <select value={city} onChange={(e)=>setCity(e.target.value)}>
          {CITY_NAMES.map(n => <option key={n}>{n}</option>)}
        </select>
      </div>

      <h2>12시간 리듬 예보 — {city}</h2>
      <div className="hourly">
        {hourly.length === 0 ? (
          <p className="tiny">시간별 데이터를 불러오는 중…</p>
        ) : hourly.map((h,i)=>(
          <div className="hour-box" key={i}>
            <p className="tiny">{h.time}</p>
            <p>{h.temp.toFixed(1)}°C / {Math.round(h.humidity)}%</p>
            <p className="tiny">{h.condition}</p>
          </div>
        ))}
      </div>

      <h2>7일 예보 — {city}</h2>
      <table className="forecast">
        <thead>
          <tr>
            <th>날짜(요일)</th>
            <th>상태</th>
            <th>최고 / 최저</th>
            <th>습도(%)</th>
          </tr>
        </thead>
        <tbody>
          {forecast.map(d => (
            <tr key={d.date}>
              <td>{dayStr(d.date)}</td>
              <td>{d.day.condition?.text}</td>
              <td>{Math.round(d.day.maxtemp_c)}° / {Math.round(d.day.mintemp_c)}°</td>
              <td>{Math.round(d.day.avghumidity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="status-box">
        <p className="status">{status}</p>
        {current && (
          <p className="tiny">
            업데이트: {new Date(current.last_updated).toLocaleString("ko-KR")}
            {"  "}({CITY[city].name_en})
          </p>
        )}
      </div>

      <footer>
        <p>Glitch Factory — Adaptive Navier Model</p>
      </footer>
    </div>
  );
}
