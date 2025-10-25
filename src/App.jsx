import React, { useEffect, useState } from "react";
import "./App.css";

const cities = [
  "서울", "안산", "안양", "용인", "수원", "인천", "강릉",
  "부산", "오사카", "후쿠오카", "유후인", "마쓰야마", "사포로", "나고야"
];

export default function App() {
  const [city, setCity] = useState("서울");
  const [forecast, setForecast] = useState(null);

  const apiKey = "YOUR_WEATHER_API_KEY"; // 👉 여기에 WeatherAPI 키 넣기

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(
          `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${city}&days=15&aqi=no&alerts=no&lang=ko`
        );
        const data = await res.json();
        setForecast(data);
      } catch (error) {
        console.error("API 오류:", error);
      }
    }
    fetchData();
  }, [city]);

  if (!forecast) return <div className="loading">날씨 데이터를 불러오는 중...</div>;

  // 시간별 예보 (12시간, 2시간 간격)
  const currentHour = new Date().getHours();
  const hourly = forecast.forecast.forecastday[0].hour
    .filter((_, i) => i >= currentHour && i < currentHour + 12 && i % 2 === 0);

  const daily = forecast.forecast.forecastday;

  return (
    <div className="app">
      {/* 상단: 흰색 영역 */}
      <header className="header">
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          {cities.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <div className="now">
          <h1>{forecast.current.temp_c.toFixed(1)}°</h1>
          <p>{forecast.current.condition.text}</p>
        </div>
      </header>

      {/* 중간: 초록색 영역 */}
      <main className="highlight">
        <p>체감 {forecast.current.feelslike_c.toFixed(1)}°</p>
        <p>습도 {forecast.current.humidity}% · 강수확률 {forecast.forecast.forecastday[0].day.daily_chance_of_rain}%</p>
      </main>

      {/* 하단: 검정색 영역 */}
      <section className="bottom">
        <div className="hourly">
          {hourly.map((h, i) => (
            <div className="hour-box" key={i}>
              <p>{new Date(h.time).getHours()}시</p>
              <p>{h.condition.text}</p>
              <p>{h.temp_c.toFixed(1)}°</p>
            </div>
          ))}
        </div>

        <div className="daily">
          {daily.map((d, i) => (
            <div className="day-box" key={i}>
              <p>{new Date(d.date).getDate()}일</p>
              <p>{d.day.condition.text}</p>
              <p>{d.day.maxtemp_c.toFixed(1)}° / {d.day.mintemp_c.toFixed(1)}°</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
