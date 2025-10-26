// App.jsx — S-Forecast ver.2.8r (Real-Time 12h Precision Edition)
import React, { useEffect, useState } from "react";
import "./App.css";

export default function App() {
  const API_KEY = "8370f7e693e34a79bdd180327252510";

  const CITY = {
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

 const [city, setCity] = useState("수원");
  const [hourly, setHourly] = useState([]);
  const [precision, setPrecision] = useState(0);

  // 정밀도 계산 (온도·습도·운량 기반 간단 모델)
  function computePrecision(temp, humidity, cloud) {
    const T = Math.abs(temp - 20) / 15;
    const H = Math.abs(humidity - 60) / 40;
    const C = cloud / 100;
    return Math.max(0, (1 - (T + H + C) / 3)).toFixed(2);
  }

  async function fetchWeather() {
    const { lat, lon } = CITY[city];
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${lat},${lon}&days=2&aqi=no&alerts=no`;
    const res = await fetch(url);
    const data = await res.json();

    const hours = data.forecast.forecastday.flatMap((d) => d.hour);
    const now = Date.now();
    const next12 = hours.filter((h) => h.time_epoch * 1000 >= now).slice(0, 12);

    const precVals = next12.map((h) =>
      computePrecision(h.temp_c, h.humidity, h.cloud)
    );
    const avgPrecision =
      precVals.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) /
      precVals.length;

    setPrecision(avgPrecision.toFixed(2));
    setHourly(next12);
  }

  useEffect(() => {
    fetchWeather();
  }, [city]);

  return (
    <div className="App">
      <h1>S-Forecast ver.2.8h</h1>

      <div className="city-select">
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          {Object.keys(CITY).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="precision-box">
        <p>
          정밀도 (Precision): <b>{precision}</b>{" "}
          {precision > 0.8 ? "고정밀" : precision > 0.6 ? "보통" : "낮음"}
        </p>
      </div>

      <h3>실시간 12시간 예보</h3>

      <div className="hourly-grid">
        {hourly.map((h, i) => (
          <div
            key={i}
            className="hour-cell"
            style={{
              borderRight:
                i === hourly.length - 1 ? "none" : "1px solid rgba(180,180,180,0.4)",
            }}
          >
            <p>{new Date(h.time).getHours()}시</p>
            <p>
              {h.temp_c.toFixed(1)}°C / {h.humidity}%
            </p>
            <p>{h.condition.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}