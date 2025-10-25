import React, { useEffect, useState } from "react";
import "./App.css";

const API_KEY = "8370f7e693e34a79bdd180327252510";

// 한글 → 영어 변환 매핑
const cityMap = {
  "서울": "Seoul",
  "안산": "Ansan",
  "안양": "Anyang",
  "용인": "Yongin",
  "수원": "Suwon",
  "인천": "Incheon",
  "강릉": "Gangneung",
  "부산": "Busan",
  "오사카": "Osaka",
  "후쿠오카": "Fukuoka",
  "유후인": "Yufuin",
  "마쓰야마": "Matsuyama",
  "사포로": "Sapporo",
  "나고야": "Nagoya"
};

export default function App() {
  const [selectedCity, setSelectedCity] = useState("서울");
  const [hourly, setHourly] = useState([]);
  const [daily, setDaily] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWeather(selectedCity);
  }, [selectedCity]);

  const fetchWeather = async (city) => {
    try {
      const query = cityMap[city] || city; // 영문 도시명 변환
      console.log(`📡 Fetching weather for: ${query}`);

      const res = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${query}&days=10&lang=ko`
      );

      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }

      const data = await res.json();
      console.log("✅ WeatherAPI Response:", data);

      if (!data.forecast || !data.forecast.forecastday) {
        throw new Error(`No forecast data for "${query}"`);
      }

      const hourlyData = data.forecast.forecastday[0].hour
        .filter((_, i) => i % 3 === 0)
        .map((h) => ({
          time: h.time.split(" ")[1],
          temp: Math.round(h.temp_c),
          condition: h.condition.text
        }));

      const dailyData = data.forecast.forecastday.map((d) => ({
        date: d.date,
        avgTemp: Math.round(d.day.avgtemp_c),
        condition: d.day.condition.text
      }));

      setHourly(hourlyData);
      setDaily(dailyData);
      setError(null);
    } catch (err) {
      console.error("❌ Error fetching weather:", err);
      setError(err.message);
      setHourly([]);
      setDaily([]);
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
          {Object.keys(cityMap).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </header>

      {error ? (
        <p style={{ color: "red", marginTop: "20px" }}>
          ⚠️ 데이터 로드 실패: {error}
        </p>
      ) : (
        <>
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
        </>
      )}

      <footer>© 2025 Atthra Weather · Glitch Factory</footer>
    </div>
  );
}
