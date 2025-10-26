// App.jsx — S-Forecast ver.2.7r (Continuous Hour Fix Edition)
import React, { useEffect, useState } from "react";
import "./App.css";

export default function App() {
  const API_KEY = "8370f7e693e34a79bdd180327252510";

  // --- 도시 정보 (한글·영문·좌표)
  const CITY = {
    서울: { name_en: "Seoul", lat: 37.5665, lon: 126.9780 },
    수원: { name_en: "Suwon", lat: 37.2636, lon: 127.0286 },
    인천: { name_en: "Incheon", lat: 37.4563, lon: 126.7052 },
    용인: { name_en: "Yongin", lat: 37.2411, lon: 127.1775 },
    부산: { name_en: "Busan", lat: 35.1796, lon: 129.0756 },
    대구: { name_en: "Daegu", lat: 35.8714, lon: 128.6014 },
    광주: { name_en: "Gwangju", lat: 35.1595, lon: 126.8526 },
    대전: { name_en: "Daejeon", lat: 36.3504, lon: 127.3845 },
    강릉: { name_en: "Gangneung", lat: 37.7519, lon: 128.8761 },
    제주: { name_en: "Jeju", lat: 33.4996, lon: 126.5312 },
  };

  const [city, setCity] = useState("수원");
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- 실시간 날씨 데이터 가져오기 ---
  async function fetchWeather(cityKey) {
    try {
      setLoading(true);
      const { lat, lon } = CITY[cityKey];
      const res = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${lat},${lon}&days=2&aqi=no&alerts=no`
      );
      const data = await res.json();

      // --- 시간 데이터 (오늘+내일 연속)
      const allHours = data.forecast.forecastday.flatMap(day => day.hour);
      const now = Date.now();

      // --- 현재 시각 이후 12시간 연속 데이터
      const next12 = allHours
        .filter(h => h.time_epoch * 1000 >= now)
        .slice(0, 12);

      setWeather({
        current: data.current,
        hourly: next12,
        daily: data.forecast.forecastday,
      });
    } catch (e) {
      console.error("Weather fetch error:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWeather(city);
  }, [city]);

  // --- 자연어 변환 (간단한 라벨)
  const labelWeather = (text) => {
    if (text.includes("sunny") || text.includes("clear")) return "맑음";
    if (text.includes("cloudy")) return "흐림";
    if (text.includes("partly")) return "가끔 구름 많음";
    if (text.includes("rain")) return "비";
    if (text.includes("shower")) return "소나기";
    if (text.includes("snow")) return "눈";
    return "대체로 맑음";
  };

  // --- 렌더링 ---
  return (
    <div className="App">
      <h1>S-Forecast ver.2.7r</h1>
      <div className="selector">
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          {Object.keys(CITY).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>데이터 불러오는 중...</p>}

      {weather && (
        <div className="forecast">
          <h2>
            {city} 실시간 리듬 예보 — {new Date().toLocaleString()}
          </h2>
          <div className="hourly">
            {weather.hourly.map((h, idx) => (
              <div key={idx} className="hour-box">
                <p>
                  {new Date(h.time).getHours()}시 —{" "}
                  {labelWeather(h.condition.text.toLowerCase())}
                </p>
                <p>
                  온도 {h.temp_c}°C / 습도 {h.humidity}%
                </p>
              </div>
            ))}
          </div>

          <h3>7일 예보</h3>
          <div className="daily">
            {weather.daily.map((d, i) => (
              <div key={i} className="day-box">
                <p>{d.date}</p>
                <p>{labelWeather(d.day.condition.text.toLowerCase())}</p>
                <p>
                  {Math.round(d.day.mintemp_c)}° / {Math.round(d.day.maxtemp_c)}°
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
