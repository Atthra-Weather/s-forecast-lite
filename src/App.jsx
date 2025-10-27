// App.jsx — S-Forecast ver.3.0-cef (Navier–Riemann–CEF Hybrid Edition)
import React, { useEffect, useState } from "react";
import "./App.css";

export default function App() {
  const API_KEY = "8370f7e693e34a79bdd180327252510";

  const CITY = {
    서울:   { name_en: "Seoul", lat: 37.5665, lon: 126.9780, alt: 20 },
    수원:   { name_en: "Suwon", lat: 37.2636, lon: 127.0286, alt: 30 },
    용인:   { name_en: "Yongin", lat: 37.2753, lon: 127.1159, alt: 70 },
    안산:   { name_en: "Ansan", lat: 37.3219, lon: 126.8309, alt: 15 },
    안양:   { name_en: "Anyang", lat: 37.3943, lon: 126.9568, alt: 25 },
    강릉:   { name_en: "Gangneung", lat: 37.7519, lon: 128.8761, alt: 50 },
    부산:   { name_en: "Busan", lat: 35.1796, lon: 129.0756, alt: 5 },
    오사카: { name_en: "Osaka", lat: 34.6937, lon: 135.5023, alt: 10 },
    후쿠오카:{ name_en: "Fukuoka", lat: 33.5902, lon: 130.4017, alt: 20 },
    유후인: { name_en: "Yufuin", lat: 33.2659, lon: 131.3461, alt: 150 },
    나고야: { name_en: "Nagoya", lat: 35.1815, lon: 136.9066, alt: 15 },
    마쓰야마:{ name_en: "Matsuyama", lat: 33.8393, lon: 132.7657, alt: 30 },
  };

  const [city, setCity] = useState("수원");
  const [forecast, setForecast] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [status, setStatus] = useState("Loading…");

  const WEEK = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const dayStr = (iso) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} (${WEEK[d.getDay()]})`;
  };

  function refineCondition(text) {
    const t = text?.toLowerCase() || "";
    if (t.includes("sunny") || t.includes("clear")) return "맑음";
    if (t.includes("partly") || t.includes("mostly")) return "대체로 맑음";
    if (t.includes("cloud")) return "가끔 구름 많음";
    if (t.includes("overcast")) return "대체로 흐림";
    if (t.includes("rain") && t.includes("snow")) return "비 또는 눈";
    if (t.includes("rain") || t.includes("drizzle") || t.includes("shower")) return "비 또는 소나기";
    if (t.includes("snow") || t.includes("sleet")) return "눈";
    if (t.includes("fog") || t.includes("mist") || t.includes("haze")) return "안개";
    return "기타";
  }

  // -----------------------------
  // 🔹 Nonlinear S (Navier–Riemann Base)
  // -----------------------------
  function riemannZetaApprox(s, n = 40) {
    let sum = 0;
    for (let k = 1; k <= n; k++) sum += 1 / Math.pow(k, s);
    return sum;
  }

  function computeSPlusRiemann({ temp, humidity, wind = 0, cloud = 0 }) {
    const T0 = 20, H0 = 50;
    const sigmaT = 7, sigmaH = 15;
    const v_c = 10, rho0 = 1.2, kappa = 0.4;

    const ST = Math.exp(-((temp - T0) ** 2) / (2 * sigmaT ** 2));
    const SH = Math.exp(-((humidity - H0) ** 2) / (2 * sigmaH ** 2));
    const SC = 1 - cloud / 100;
    const SV = Math.tanh(wind / v_c);
    const baseS = rho0 * (ST * SH * SC) - kappa * SV;

    const sigma = 1 + 0.1 * Math.sin(temp / 10) - 0.05 * Math.cos(humidity / 30);
    const zeta = riemannZetaApprox(sigma);
    const corr = 1 + 0.02 * Math.tanh(zeta / 20);
    const S = baseS * corr;

    return Math.max(0, Math.min(3, S));
  }

  // -----------------------------
  // 🔹 CEF Rhythm Correction Layer
  // -----------------------------
  function computeSPlusCEF({ temp, humidity, wind = 0, cloud = 0 }) {
    const α = 0.8, β = 0.6;
    const dρ_dt = (humidity - 50) / 100; // existence density gradient
    const gradΦ = (temp - 20) / 25 + (wind / 10) - (cloud / 100);
    const Scef = α * dρ_dt ** 2 + β * gradΦ ** 2;
    return Math.min(3, Math.max(0, Scef * 1.2));
  }

  // 🔹 Combined Hybrid (Navier–Riemann + CEF)
  function computeSCombined(params) {
    const S_R = computeSPlusRiemann(params);
    const S_C = computeSPlusCEF(params);
    const weight = 0.6; // 60% CEF influence
    return (1 - weight) * S_R + weight * S_C;
  }

  function interpretRhythm(S) {
    if (S < 0.8) return "안정 — 리듬이 평형을 유지 중";
    if (S < 1.2) return "평형 — 구름 많고 완만한 진동";
    if (S < 2.0) return "불안정 — 대기 교호 상승, 비 가능성↑";
    return "초과활성 — 급격한 리듬 전환, 폭풍·강풍 주의";
  }

  // -----------------------------
  // 🔹 Fetch Weather + Apply Hybrid Model
  // -----------------------------
  async function fetchWeather(cityKo) {
    try {
      const { lat, lon } = CITY[cityKo];
      const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${lat},${lon}&days=10&aqi=no&alerts=no`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API Error ${res.status}`);

      const data = await res.json();
      const forecastDays = data.forecast?.forecastday ?? [];
      const allHours = forecastDays.flatMap(f => f.hour) ?? [];

      const nowEpoch = Math.floor(Date.now() / 1000);
      const next12h = allHours
        .filter(h => h.time_epoch >= nowEpoch)
        .slice(0, 12)
        .map(h => {
          const S = computeSCombined({
            temp: h.temp_c,
            humidity: h.humidity,
            wind: h.wind_kph,
            cloud: h.cloud,
          });
          return {
            time: new Date(h.time_epoch * 1000).toLocaleTimeString("ko-KR", { hour: "2-digit" }),
            temp: h.temp_c,
            humidity: h.humidity,
            condition: refineCondition(h.condition.text),
            wind_mps: h.wind_kph / 3.6,
            S,
            rhythm: interpretRhythm(S),
          };
        });

      const days = forecastDays.slice(0, 10).map(d => ({
        date: d.date,
        maxtemp: d.day.maxtemp_c,
        mintemp: d.day.mintemp_c,
        humidity: d.day.avghumidity,
        condition: refineCondition(d.day.condition.text),
      }));

      setHourly(next12h);
      setForecast(days);
      setStatus("Data updated successfully (CEF Hybrid)");
    } catch (e) {
      console.error(e);
      setStatus("Connection limited — please retry later");
    }
  }

  useEffect(() => { fetchWeather(city); }, [city]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  return (
    <div className="App">
      <h1>S-Forecast ver.3.0-cef</h1>

      <div className="selector">
        <label>도시 선택: </label>
        <select value={city} onChange={(e)=>setCity(e.target.value)}>
          {Object.keys(CITY).map(n => <option key={n}>{n}</option>)}
        </select>
      </div>

      <p className="tiny-date">{todayStr}</p>

      <div className="hourly">
        {hourly.length === 0 ? (
          <p className="tiny">Loading data…</p>
        ) : hourly.map((h,i)=>(
          <div key={i} className="hour-box">
            <p className="tiny">{h.time}</p>
            <p>{h.temp.toFixed(1)}°C / {h.humidity}%</p>
            <p>{h.condition}</p>
            <p className="tiny">풍속 {h.wind_mps.toFixed(1)} m/s</p>
            <p className="tiny">리듬: {h.rhythm}</p>
          </div>
        ))}
      </div>

      <table className="forecast">
        <thead>
          <tr><th>Date</th><th>Condition</th><th>High / Low</th><th>Humidity (%)</th></tr>
        </thead>
        <tbody>
          {forecast.map((d, i) => (
            <tr key={i}>
              <td>{dayStr(d.date)}</td>
              <td>{d.condition}</td>
              <td>{Math.round(d.maxtemp)}° / {Math.round(d.mintemp)}°</td>
              <td>{Math.round(d.humidity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="status">{status}</p>
      <footer>
        <p>Glitch Factory — Navier–Riemann–CEF Hybrid Model</p>
      </footer>
    </div>
  );
}
