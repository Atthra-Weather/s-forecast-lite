// App.jsx — S-Forecast ver.2.7s (6-Hour Continuum Edition)
import React, { useEffect, useState } from "react";
import "./App.css";

export default function App() {
  const API_KEY = "8370f7e693e34a79bdd180327252510";
  const [city, setCity] = useState("서울");
  const [weather, setWeather] = useState(null);

  const CITY = {
    서울: { name_en: "Seoul", lat: 37.5665, lon: 126.9780 },
    수원: { name_en: "Suwon", lat: 37.2636, lon: 127.0286 },
    부산: { name_en: "Busan", lat: 35.1796, lon: 129.0756 },
    도쿄: { name_en: "Tokyo", lat: 35.6762, lon: 139.6503 },
    오사카: { name_en: "Osaka", lat: 34.6937, lon: 135.5023 },
    후쿠오카: { name_en: "Fukuoka", lat: 33.5904, lon: 130.4017 },
    뉴욕: { name_en: "New York", lat: 40.7128, lon: -74.006 },
    런던: { name_en: "London", lat: 51.5072, lon: -0.1276 },
    파리: { name_en: "Paris", lat: 48.8566, lon: 2.3522 },
    로스앤젤레스: { name_en: "Los Angeles", lat: 34.0522, lon: -118.2437 },
    시드니: { name_en: "Sydney", lat: -33.8688, lon: 151.2093 }
  };

  useEffect(() => {
    const fetchWeather = async () => {
      const { lat, lon } = CITY[city];
      const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${lat},${lon}&days=10&aqi=no&alerts=no`;
      const res = await fetch(url);
      const data = await res.json();
      setWeather(data);
    };
    fetchWeather();
  }, [city]);

  if (!weather) return <div className="loading">Loading...</div>;

  const current = weather.current;
  const hourly = weather.forecast.forecastday[0].hour;

  // ✅ 현재 시각 기준 연속 12시간 데이터 정렬
  const now = new Date();
  const currentHour = now.getHours();
  const next12Hours = [];
  for (let i = 0; i < 12; i++) {
    const idx = (currentHour + i) % 24;
    next12Hours.push(hourly[idx]);
  }

  const forecastDays = weather.forecast.forecastday;

  return (
    <div className="App">
      <h1>S-Forecast ver.2.7s — 6-Hour Continuum Edition</h1>

      <select value={city} onChange={(e) => setCity(e.target.value)}>
        {Object.keys(CITY).map((name) => (
          <option key={name}>{name}</option>
        ))}
      </select>

      <div className="current">
        <h2>{city} 실시간</h2>
        <p>
          {now.toLocaleString()}<br />
          {current.condition.text} / {current.temp_c}°C / 습도 {current.humidity}%
        </p>
      </div>

      <h3>🌤 12시간 리듬 예보</h3>
      <div className="hourly-grid">
        {next12Hours.map((h, i) => (
          <div key={i} className="hour-cell">
            <p>{h.time.split(" ")[1]}</p>
            <p>{h.temp_c}°C</p>
            <p>{h.condition.text}</p>
          </div>
        ))}
      </div>

      <h3>📅 10일 예보</h3>
      <table className="forecast-table">
        <thead>
          <tr>
            <th>날짜</th>
            <th>상태</th>
            <th>최고</th>
            <th>최저</th>
            <th>강수확률</th>
          </tr>
        </thead>
        <tbody>
          {forecastDays.map((day, i) => (
            <tr key={i}>
              <td>{day.date}</td>
              <td>{day.day.condition.text}</td>
              <td>{day.day.maxtemp_c}°C</td>
              <td>{day.day.mintemp_c}°C</td>
              <td>{day.day.daily_chance_of_rain}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
