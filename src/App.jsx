// App.jsx — S-Forecast ver.2.6r (Real-Time Restore Edition)
import React, { useEffect, useState } from "react";
import "./App.css";

export default function App() {
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
    { name: "마쓰야마", query: "Matsuyama" }
  ];

  const [city, setCity] = useState(cities[0]);
  const [forecast, setForecast] = useState([]);
  const [current, setCurrent] = useState(null);
  const [status, setStatus] = useState("");
  const [realTime, setRealTime] = useState({ desc: "", temp: 0, humidity: 0 });

  const alpha = 0.82, beta = 0.68, gamma = 0.03, kappa = 1.45, dt = 0.01;

  useEffect(() => {
    fetchWeather(city.query);
  }, [city]);

  async function fetchWeather(cityName) {
    try {
      const apiKey = "8370f7e693e34a79bdd180327252510";
      const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${cityName}&days=7&aqi=no&alerts=no&lang=ko`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data || !data.forecast || !data.forecast.forecastday) {
        setForecast([]);
        setCurrent(null);
        setStatus("데이터 없음 (API 응답 누락)");
        return;
      }

      setForecast(data.forecast.forecastday);
      setCurrent(data.current);
      const rhythm = computeRhythm(data.forecast.forecastday);
      setStatus(rhythm);

      // ✅ 실시간 리듬 표시용 데이터 구성
      const real = {
        temp: data.current.temp_c,
        humidity: data.current.humidity,
        desc: data.current.condition.text
      };
      setRealTime(real);

    } catch (e) {
      console.error("Weather fetch error:", e);
      setStatus("데이터를 불러오지 못했습니다.");
    }
  }

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
      const T = normT[i], H = normH[i], W = normW[i];
      const α = alpha + 0.2 * (T - 0.5);
      const β = beta + 0.1 * (H - 0.5);
      const η = 0.05 + 0.1 * W;
      const lam_up = α * rho, lam_down = β * (1 - rho);
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

      {/* 🔹 실시간 영역 */}
      <div className="realtime">
        <p className="date">{new Date().toLocaleDateString("ko-KR")}</p>
        <p className="city">{city.name}</p>
        <p className="temp">{realTime.temp.toFixed(1)}°C</p>
        <p className="humidity">습도 {realTime.humidity}%</p>
        <p className="desc">{realTime.desc}</p>
      </div>

      {/* 🔹 리듬 상태 */}
      <div className="status-box">
        <p className="status">{status}</p>
      </div>

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
