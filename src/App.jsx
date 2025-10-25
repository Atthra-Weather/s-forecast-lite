import React, { useState, useEffect } from "react";
import "./App.css";

const API_KEY = "74f3c722bf494188b92132611252510";

const cities = [
  { name: "서울", query: "Seoul" },
  { name: "안산", query: "Ansan" },
  { name: "안양", query: "Anyang" },
  { name: "용인", query: "Yongin" },
  { name: "수원", query: "Suwon" },
  { name: "인천", query: "Incheon" },
  { name: "강릉", query: "Gangneung" },
  { name: "부산", query: "Busan" },
  { name: "오사카", query: "Osaka" },
  { name: "후쿠오카", query: "Fukuoka" },
  { name: "유후인", query: "Yufuin" },
  { name: "마쓰야마", query: "Matsuyama" },
  { name: "사포로", query: "Sapporo" },
  { name: "나고야", query: "Nagoya" },
];

function App() {
  const [city, setCity] = useState(cities[0]);
  const [hourly, setHourly] = useState([]);
  const [daily, setDaily] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchWeather = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${city.query}&days=3&aqi=no&alerts=no`
      );
      const data = await res.json();
      const now = new Date();

      // 현재 시간부터 12시간까지만
      const upcomingHours = data.forecast.forecastday
        .flatMap((d) => d.hour)
        .filter((h) => new Date(h.time) >= now)
        .slice(0, 12);

      const upcomingDays = data.forecast.forecastday.slice(1);

      setHourly(upcomingHours);
      setDaily(upcomingDays);
    } catch (err) {
      console.error("Error fetching weather:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, [city]);

  return (
    <div className="app">
      <header>
        <h1>S-Forecast Lite</h1>
        <select
          value={city.query}
          onChange={(e) => {
            const selected = cities.find((c) => c.query === e.target.value);
            setCity(selected);
          }}
        >
          {cities.map((c) => (
            <option key={c.query} value={c.query}>
              {c.name}
            </option>
          ))}
        </select>
      </header>

      {loading ? (
        <p className="loading">로딩 중...</p>
      ) : (
        <>
          <section className="hourly">
            <h2>12시간 예보</h2>
            <table>
              <thead>
                <tr>
                  <th>시간</th>
                  <th>날씨</th>
                  <th>온도</th>
                  <th>체감</th>
                  <th>강수%</th>
                </tr>
              </thead>
              <tbody>
                {hourly.map((h) => (
                  <tr key={h.time}>
                    <td>{new Date(h.time).getHours()}시</td>
                    <td>
                      <img
                        src={h.condition.icon}
                        alt={h.condition.text}
                        className="icon"
                      />
                    </td>
                    <td>{h.temp_c.toFixed(1)}°</td>
                    <td>{h.feelslike_c.toFixed(1)}°</td>
                    <td>{h.chance_of_rain || 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="daily">
            <h2>다음날 요약</h2>
            <div className="daily-cards">
              {daily.map((d) => (
                <div className="day-card" key={d.date}>
                  <p className="date">{d.date}</p>
                  <img
                    src={d.day.condition.icon}
                    alt={d.day.condition.text}
                    className="icon-large"
                  />
                  <p>
                    {d.day.maxtemp_c.toFixed(0)}° /{" "}
                    {d.day.mintemp_c.toFixed(0)}°
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default App;
