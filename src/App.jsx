  // App.jsx — S-Forecast ver.2.7 (12-Hour Precision Edition)
import React, { useEffect, useState } from "react";
import "./App.css";

export default function App() {
  const API_KEY = "8370f7e693e34a79bdd180327252510";
  const [city, setCity] = useState("서울");
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);

  const CITY = {
    서울:    { name_en: "Seoul",     lat: 37.5665, lon: 126.9780, alt: 20 },
    수원:    { name_en: "Suwon",     lat: 37.2636, lon: 127.0286, alt: 30 },
    용인:    { name_en: "Yongin",    lat: 37.2753, lon: 127.1159, alt: 70 },
    안산:    { name_en: "Ansan",     lat: 37.3219, lon: 126.8309, alt: 15 },
    안양:    { name_en: "Anyang",    lat: 37.3943, lon: 126.9568, alt: 25 },
    강릉:    { name_en: "Gangneung", lat: 37.7519, lon: 128.8761, alt: 50 },
    부산:    { name_en: "Busan",     lat: 35.1796, lon: 129.0756, alt: 5  },
    오사카:  { name_en: "Osaka",     lat: 34.6937, lon: 135.5023, alt: 10 },
    후쿠오카:{ name_en: "Fukuoka",   lat: 33.5902, lon: 130.4017, alt: 20 },
    유후인:  { name_en: "Yufuin",    lat: 33.2659, lon: 131.3461, alt: 150 },
    나고야:  { name_en: "Nagoya",    lat: 35.1815, lon: 136.9066, alt: 15 },
    마쓰야마:{ name_en: "Matsuyama", lat: 33.8393, lon: 132.7657, alt: 30 },
  };

  const fetchForecast = async () => {
    setLoading(true);
    const { lat, lon } = CITY[city];
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${lat},${lon}&hours=12&aqi=no&alerts=no`;
    const res = await fetch(url);
    const data = await res.json();
    setForecast(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchForecast();
    // eslint-disable-next-line
  }, [city]);

  const navierRhythm = (temp, humidity, wind, cloud) => {
    // Adaptive Navier Rhythm Model (normalized)
    const S = (0.4 * temp + 0.3 * humidity - 0.2 * wind + 0.1 * cloud) / 100;
    return S.toFixed(2);
  };

  if (loading) return <div className="loading">로딩 중...</div>;
  if (!forecast) return <div>데이터 없음</div>;

  const now = new Date();
  const twelveHours = forecast.forecast.forecastday[0].hour.filter((h) => {
    const t = new Date(h.time);
    const diff = (t - now) / (1000 * 60 * 60);
    return diff >= 0 && diff <= 12 && (Math.round(diff) % 6 === 0);
  });

  return (
    <div className="App">
      <h1>S-Forecast ver.2.7 — 12시간 정밀판</h1>

      <select value={city} onChange={(e) => setCity(e.target.value)}>
        {Object.keys(CITY).map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>

      <h2>{city} 실시간 리듬 예보</h2>
      <p>
        {new Date(forecast.current.last_updated).toLocaleString()} 기준
      </p>

      <div className="current">
        <p>온도: {forecast.current.temp_c}°C</p>
        <p>습도: {forecast.current.humidity}%</p>
        <p>풍속: {forecast.current.wind_kph}km/h</p>
        <p>구름: {forecast.current.cloud}%</p>
        <p>
          리듬 S:{" "}
          {navierRhythm(
            forecast.current.temp_c,
            forecast.current.humidity,
            forecast.current.wind_kph,
            forecast.current.cloud
          )}
        </p>
      </div>

      <h2>12시간 리듬 예보 (6시간 간격)</h2>
      <div className="forecast-grid">
        {twelveHours.map((h, idx) => {
          const time = new Date(h.time);
          const S = navierRhythm(h.temp_c, h.humidity, h.wind_kph, h.cloud);
          const P_rain = 0.5 * h.humidity + 0.3 * h.cloud + 0.2 * h.wind_kph;
          const label = P_rain / 100 > 0.55 ? "비 가능성 있음" : "비 가능성 낮음";
          return (
            <div key={idx} className="forecast-item">
              <h3>{time.getHours()}시</h3>
              <p>온도 {h.temp_c}°C</p>
              <p>습도 {h.humidity}%</p>
              <p>구름 {h.cloud}%</p>
              <p>리듬 S={S}</p>
              <p className="label">{label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
