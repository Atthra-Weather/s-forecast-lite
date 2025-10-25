import React, { useEffect, useState } from "react";
import "./App.css";

const API_KEY = "8370f7e693e34a79bdd180327252510";
const cities = [
  "서울", "안산", "안양", "용인", "수원", "인천",
  "강릉", "부산", "오사카", "후쿠오카", "유후인",
  "마쓰야마", "사포로", "나고야"
];

export default function App() {
  const [selectedCity, setSelectedCity] = useState("서울");
  const [hourly, setHourly] = useState([]);
  const [daily, setDaily] = useState([]);

  useEffect(() => {
    fetchWeather(selectedCity);
  }, [selectedCity]);

  const fetchWeather = async (city) => {
    try {
      const res = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${city}&days=10&lang=ko`
      );
      const data = await res.json();
      console.log("Weather Data:", data);

      const now = new Date();
      const currentHour = now.getHours();

      // 12시간 (2시간 간격)
      const hourlyData = data.forecast.forecastday[0].hour
        .filter((_, i) => i % 2 === 0 && i >= currentHour && i <= currentHour + 12)
        .map((h) => ({
          time: h.time.split(" ")[1],
          temp: Math.round(h.temp_c),
          condition: h.condition.text
        }));

      // 10일 요약
      const dailyData = data.forecast.forecastday.map((d) => ({
        date: d.date,
        avgTemp: Math.round(d.day.avgtemp_c),
        condition: d.day.condition.text
      }));

      setHourly(hourlyData);
      setDaily(dailyData);
    } catch (err) {
      console.error("Error fetching weather:", err);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>S-Forecast Lite</h1>
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
        >
          {cities.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </header>

      <section className="hourly-section">
        <div className="hourly-scroll">
          {hourly.map((h, i) => (
            <div key={i} className="hour-card">
              <p>{h.time}</p>
              <p>{h.temp}°C</p>
              <p className="condition">{h.condition}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="daily-section">
        <h2>10일 예보</h2>
        <table>
          <thead>
            <tr>
              <th>날짜</th>
              <th>평균기온</th>
              <th>날씨</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((d, i) => (
              <tr key={i}>
                <td>{d.date}</td>
                <td>{d.avgTemp}°C</td>
                <td>{d.condition}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer>© 2025 Atthra Weather · Glitch Factory</footer>
    </div>
  );
}
