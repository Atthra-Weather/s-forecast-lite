import React, { useEffect, useState } from "react";
import "./App.css";

export default function SForecastApp() {
  const [weatherData, setWeatherData] = useState(null);
  const cities = [
    "Seoul", "Ansan", "Anyang", "Yongin", "Suwon", "Incheon",
    "Gangneung", "Busan", "Osaka", "Fukuoka", "Yufuin",
    "Matsuyama", "Sapporo", "Nagoya"
  ];

  const [selectedCity, setSelectedCity] = useState("Seoul");

  useEffect(() => {
    async function fetchWeather() {
      const apiKey = "YOUR_WEATHERAPI_KEY";
      const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${selectedCity}&days=15&aqi=no&alerts=no&lang=ko`;
      const res = await fetch(url);
      const data = await res.json();
      setWeatherData(data);
    }
    fetchWeather();
  }, [selectedCity]);

  if (!weatherData) return <div className="loading">로딩 중...</div>;

  const currentTime = new Date().getHours();

  const hourly = weatherData.forecast.forecastday[0].hour
    .filter(h => {
      const hour = new Date(h.time).getHours();
      return hour >= currentTime && hour <= currentTime + 12 && hour % 2 === 0;
    })
    .slice(0, 6);

  const daily = weatherData.forecast.forecastday;

  return (
    <div className="app-container">
      <header className="header">
        <h1>S-Forecast Lite</h1>
        <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
          {cities.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </header>

      <section className="hourly">
        <div className="hourly-grid">
          {hourly.map((h, i) => (
            <div key={i} className="hour-card">
              <div className="hour-time">{h.time.slice(11, 16)}</div>
              <div className="hour-temp">{h.temp_c}°</div>
              <div className="hour-cond">{h.condition.text}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="daily">
        <h2>15일 예보</h2>
        <table>
          <thead>
            <tr>
              <th>날짜</th>
              <th>날씨</th>
              <th>최고 / 최저</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((d, i) => (
              <tr key={i}>
                <td>{d.date}</td>
                <td>{d.day.condition.text}</td>
                <td>{d.day.maxtemp_c}° / {d.day.mintemp_c}°</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="footer">© 2025 Glitch Factory</footer>
    </div>
  );
}
