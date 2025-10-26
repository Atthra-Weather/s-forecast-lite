// App.jsx — S-Forecast ver.2.8t-12hN (Precision+ Nonlinear Reinforced Edition)
import React, { useEffect, useState } from "react";
import "./App.css";

export default function App() {
  const API_KEY = "8370f7e693e34a79bdd180327252510";

  const CITY = {
    서울: { name_en: "Seoul", lat: 37.5665, lon: 126.9780 },
    수원: { name_en: "Suwon", lat: 37.2636, lon: 127.0286 },
    용인: { name_en: "Yongin", lat: 37.2753, lon: 127.1159 },
    안산: { name_en: "Ansan", lat: 37.3219, lon: 126.8309 },
    부산: { name_en: "Busan", lat: 35.1796, lon: 129.0756 },
    오사카: { name_en: "Osaka", lat: 34.6937, lon: 135.5023 },
    후쿠오카: { name_en: "Fukuoka", lat: 33.5902, lon: 130.4017 },
    나고야: { name_en: "Nagoya", lat: 35.1815, lon: 136.9066 },
  };

  const [city, setCity] = useState("수원");
  const [forecast, setForecast] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [status, setStatus] = useState("로딩 중…");

  // --- 시간 문자열 변환
  const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
  const dayStr = (iso) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK[d.getDay()]})`;
  };

  // --- 자연어 라벨 세분화
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

  // --- S 리듬 계산식 (비선형)
  function computeSPlus({ temp, humidity, wind = 0, cloud = 0 }) {
    const T0 = 20, H0 = 50;
    const sigmaT = 7, sigmaH = 15;
    const v_c = 10, rho0 = 1.2, kappa = 0.4;

    const ST = Math.exp(-((temp - T0) ** 2) / (2 * sigmaT ** 2));
    const SH = Math.exp(-((humidity - H0) ** 2) / (2 * sigmaH ** 2));
    const SC = 1 - cloud / 100;
    const SV = Math.tanh(wind / v_c);

    const S = rho0 * (ST * SH * SC) - kappa * SV;
    return Math.max(0, Math.min(3, S));
  }

  // --- S값을 상태로 변환
  function labelFromS(S) {
    if (S < 0.8) return "불안정";
    if (S < 1.5) return "보통";
    if (S < 2.3) return "안정";
    return "매우 안정";
  }

  async function fetchWeather(cityKo) {
    try {
      const { lat, lon } = CITY[cityKo];
      const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${lat},${lon}&days=3&aqi=no&alerts=no`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API Error ${res.status}`);

      const data = await res.json();
      const forecastDays = data.forecast?.forecastday ?? [];
      const allHours = forecastDays.flatMap(f => f.hour) ?? [];

      // --- 현재 시각 이후 12시간
      const nowEpoch = Math.floor(Date.now() / 1000);
      const next12h = allHours
        .filter(h => h.time_epoch >= nowEpoch)
        .slice(0, 12)
        .map(h => ({
          time: new Date(h.time_epoch * 1000).toLocaleTimeString("ko-KR", { hour: "2-digit" }),
          temp: h.temp_c,
          humidity: h.humidity,
          condition: refineCondition(h.condition.text),
          S: computeSPlus({
            temp: h.temp_c,
            humidity: h.humidity,
            wind: h.wind_kph,
            cloud: h.cloud,
          }),
        }));

      const days = forecastDays.map(d => ({
        date: d.date,
        maxtemp: d.day.maxtemp_c,
        mintemp: d.day.mintemp_c,
        humidity: d.day.avghumidity,
        condition: refineCondition(d.day.condition.text),
      }));

      setHourly(next12h);
      setForecast(days);
      setStatus("데이터 업데이트 완료");
    } catch (e) {
      console.error(e);
      setStatus("데이터 연결 제한 — 잠시 후 재시도");
    }
  }

  useEffect(() => {
    fetchWeather(city);
  }, [city]);

  // --- 렌더링
  return (
    <div className="App">
      <h1>S-Forecast ver.2.8t — Real-Time 12h Precision+ Nonlinear Edition</h1>

      <div className="selector">
        <label>도시 선택: </label>
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          {Object.keys(CITY).map(n => <option key={n}>{n}</option>)}
        </select>
      </div>

      <h2>실시간 12시간 리듬 예보 — {city}</h2>
      <div className="hourly" style={{ display: "flex", gap: "10px", overflowX: "auto" }}>
        {hourly.length === 0 ? (
          <p className="tiny">데이터 불러오는 중…</p>
        ) : hourly.map((h, i) => (
          <div key={i} style={{
            flex: "0 0 120px",
            background: "#f9f9f9",
            borderRadius: "8px",
            textAlign: "center",
            padding: "6px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
          }}>
            <p className="tiny">{h.time}</p>
            <p>{h.temp.toFixed(1)}°C / {h.humidity}%</p>
            <p>{h.condition}</p>
          </div>
        ))}
      </div>

      <h2>7일 예보 — {city}</h2>
      <table className="forecast">
        <thead>
          <tr><th>날짜(요일)</th><th>상태</th><th>최고 / 최저</th><th>습도(%)</th></tr>
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

      <div className="status-box">
        <p>{status}</p>
      </div>

      <footer>
        <p>Glitch Factory — Adaptive Navier–CEF Hybrid Model</p>
      </footer>
    </div>
  );
}
