import React, { useEffect, useState } from "react";
import "./App.css";

export default function App() {
  // 🔹 한글표시 + API 영문 매핑
  const cities = [
    { name: "서울", query: "Seoul" },
    { name: "수원", query: "Suwon" },
    { name: "안산", query: "Ansan" },
    { name: "안양", query: "Anyang" },
    { name: "강릉", query: "Gangneung" },
    { name: "부산", query: "Busan" },
    { name: "오사카", query: "Osaka" },
    { name: "후쿠오카", query: "Fukuoka" },
    { name: "유후인", query: "Yufuin" },
    { name: "나고야", query: "Nagoya" },
    { name: "미쓰야마", query: "Matsuyama" }
  ];

  const [forecast, setForecast] = useState({});
  const [loading, setLoading] = useState(true);

  const API_KEY = "74f3c722bf494188b92132611252510"; 
  const α = 0.7, β = 0.5;

  function computeS(h) {
    const hum = h.humidity ?? 0;
    const cloud = h.cloud ?? 0;
    const temp = h.temp_c ?? 0;
    const S = (0.6 * hum + 0.4 * cloud) / 100 - 0.002 * temp;
    return Math.max(0, Math.min(1, S));
  }

  function softenIfNoPrecip(label, precip_mm, humidity, cloud) {
    if ((precip_mm ?? 0) < 0.1 && humidity < 86 && cloud < 80) {
      if (label.includes("비")) return "대체로 흐림 (비 가능성 약함)";
    }
    return label;
  }

  function labelFromS(S, isDaily = false) {
    if (!isDaily) {
      if (S < 0.45) return "맑음";
      if (S < 0.85) return "흐림";
      return "비";
    }
    if (S < 0.32) return "맑음";
    if (S < 0.50) return "대체로 맑음";
    if (S < 0.65) return "가끔 구름 많음";
    if (S < 0.80) return "대체로 흐림";
    if (S < 0.92) return "비 또는 소나기";
    return "비";
  }

  async function getWeather(cityQuery) {
    const res = await fetch(
      `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${cityQuery}&days=7&lang=ko`
    );
    return await res.json();
  }

  async function loadAll() {
    setLoading(true);
    const results = await Promise.all(
      cities.map(async ({ name, query }) => {
        try {
          const data = await getWeather(query);
          const hours = data.forecast.forecastday[0].hour;
          const Slist = hours.map(h => computeS(h));
          const Smean = Slist.reduce((a, b) => a + b, 0) / Slist.length;

          const d = data.forecast.forecastday[0].day;
          const condBase = labelFromS(Smean, true);
          const cond = softenIfNoPrecip(condBase, d.totalprecip_mm ?? 0, d.avghumidity ?? 0, d.daily_chance_of_rain ?? 0);
          const tAvg = d.avgtemp_c;
          const tMax = (tAvg + α * Smean).toFixed(1);
          const tMin = (tAvg - β * Smean).toFixed(1);

          return { name, condition: cond, temp: `${tMin}° / ${tMax}°`, icon: d.condition?.icon ?? "" };
        } catch {
          return { name, condition: "데이터 오류", temp: "-", icon: "" };
        }
      })
    );

    const obj = {};
    results.forEach(r => (obj[r.name] = r));
    setForecast(obj);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  return (
    <div className="App">
      <h2>S-Forecast ver.2.6n3 — Regional Resonance (KOR–ENG)</h2>
      {loading ? (
        <p>날씨 데이터를 불러오는 중...</p>
      ) : (
        <div className="grid">
          {cities.map(({ name }) => {
            const f = forecast[name];
            if (!f) return <div key={name} className="card">{name}: -</div>;
            return (
              <div key={name} className="card">
                <h3>{name}</h3>
                <p>{f.condition}</p>
                <p>{f.temp}</p>
                {f.icon && <img src={f.icon} alt={f.condition} />}
              </div>
            );
          })}
        </div>
      )}
      <button onClick={loadAll}>새로고침</button>
    </div>
  );
}
