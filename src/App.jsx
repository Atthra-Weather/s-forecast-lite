// App.jsx — S-Forecast ver.2.6 (한글표시 + Adaptive Precision Edition)
import React, { useEffect, useState } from "react";
import "./App.css";

export default function App() {
  // 🔹 한글표시 + API영문맵핑
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

  const [city, setCity] = useState(cities[0]);
  const [forecast, setForecast] = useState([]);
  const [current, setCurrent] = useState(null);
  const [status, setStatus] = useState("");

  // === Adaptive Navier Rhythm Parameters ===
  const alpha = 0.82;
  const beta = 0.68;
  const gamma = 0.03;
  const kappa = 1.45;
  const dt = 0.01;

  useEffect(() => {
    fetchWeather(city.query);
  }, [city]);

  async function fetchWeather(cityName) {
    try {
      const apiKey = "74f3c722bf494188b92132611252510";
      const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${cityName}&days=7&aqi=no&alerts=no&lang=ko`;
      const res = await fetch(url);
      const data = await res.json();

      if (data && data.forecast) {
        setForecast(data.forecast.forecastday);
        setCurrent(data.current);
        const rhythm = computeRhythm(data.forecast.forecastday);
        setStatus(rhythm);
      }
    } catch (e) {
      console.error("Weather fetch error:", e);
      setStatus("데이터를 불러오지 못했습니다.");
    }
  }

  // === Adaptive Navier Rhythm Model ===
  function computeRhythm(days) {
    const temps = days.map((d) => d.day.avgtemp_c);
    const hums = days.map((d) => d.day.avghumidity);
    const winds = days.map((d) => d.day.maxwind_kph);

    const n = temps.length;
    const normT = temps.map((t) => (t - Math.min(...temps)) / (Math.max(...temps) - Math.min(...temps) + 1e-6));
    const normH = hums.map((h) => h / 100);
    const normW = winds.map((w) => w / Math.max(...winds));

    let rho = 0.5, S = 0.0;
    for (let i = 0; i < n; i++) {
      const T = normT[i];
      const H = normH[i];
      const W = normW[i];

      const α = alpha + 0.2 * (T - 0.5);
      const β = beta + 0.1 * (H - 0.5);
      const η = 0.05 + 0.1 * W;

      const lam_up = α * rho;
      const lam_down = β * (1 - rho);
      const drho = -gamma * rho + (lam_up - lam_down) * rho - η * Math.max(0, rho - 0.4);
      rho += drho * dt;

      const dS = (lam_up - lam_down) * kappa;
      S += dS * dt;
    }

    const ratio = (S - 0.5) * 2.2;
    if (ratio < -0.5) return "안정 — 대체로 맑음";
    if (ratio < 0.2) return "평형 — 구름 많음";
    if (ratio < 0.8) return "불안정 — 오후 한때 소나기 가능";
    return "활성 — 비 또는 흐림";
  }

  return (
    <div className="App">
      <h1>S-Forecast ver.2.6</h1>

      <div className="selector">
        <label>도시 선택: </label>
        <select
          value={city.query}
          onChange={(e) => setCity(cities.find((c) => c.query === e.target.value))}
        >
          {cities.map((c) => (
            <option key={c.query} value={c.query}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* 🔹 선택된 도시명 표시 */}
      <p className="city-name">{city.name}</p>

      {current && (
        <div className="current">
          <p className="date">{new Date(current.last_updated).toLocaleDateString("ko-KR")}</p>
          <p className="temp">현재 온도 {current.temp_c}°C, 습도 {current.humidity}%</p>
          <p className="status">{status}</p>
        </div>
      )}

      <table className="forecast">
        <thead>
          <tr>
            <th>날짜</th>
            <th>날씨</th>
            <th>최고/최저</th>
          </tr>
        </thead>
        <tbody>
          {forecast.map((day) => (
            <tr key={day.date}>
              <td>{new Date(day.date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</td>
              <td>{day.day.condition.text}</td>
              <td>
                {Math.round(day.day.maxtemp_c)}° / {Math.round(day.day.mintemp_c)}°
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer>
        <p>Glitch Factory — Adaptive Navier Model</p>
      </footer>
    </div>
  );
}
