// App.jsx — S-Forecast ver.2.8r (Real-Time 12h Precision Edition)
import React, { useEffect, useState } from "react";
import "./App.css";

export default function App() {
  const API_KEY = "8370f7e693e34a79bdd180327252510";

  const CITY = {
    서울:   { name_en: "Seoul", lat: 37.5665, lon: 126.9780, alt: 20 },
    수원:   { name_en: "Suwon", lat: 37.2636, lon: 127.0286, alt: 30 },
    용인:   { name_en: "Yongin", lat: 37.2753, lon: 127.1159, alt: 70 },
    안산:   { name_en: "Ansan", lat: 37.3219, lon: 126.8309, alt: 15 },
    부산:   { name_en: "Busan", lat: 35.1796, lon: 129.0756, alt: 5 },
    오사카: { name_en: "Osaka", lat: 34.6937, lon: 135.5023, alt: 10 },
    후쿠오카:{ name_en: "Fukuoka", lat: 33.5902, lon: 130.4017, alt: 20 },
  };

  const [city, setCity] = useState("수원");
  const [forecast, setForecast] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [status, setStatus] = useState("로딩 중…");

  // === S-Model ===
  function computeSPlus({ temp, humidity, wind, cloud, dewpoint, pressure, lat, alt, cityName }) {
    const t = (temp - 15) / 12;
    const h = (humidity - 60) / 20;
    const w = (wind - 10) / 10;
    const c = (cloud - 50) / 50;
    const td = dewpoint ?? (temp - (100 - humidity) / 5);
    const spread = Math.max(0, temp - td);
    const spread_n = Math.min(1.5, spread / 6);
    const p = pressure ?? 1013;
    const p_dev = Math.max(0, (1016 - p) / 12);
    const coastal = ["부산", "오사카", "후쿠오카"].includes(cityName) ? 0.95 : 1.0;
    const inland  = ["수원", "용인", "안산"].includes(cityName) ? 1.05 : 1.0;

    let s =
      0.8 * h +
      0.6 * c +
      0.3 * w +
      0.25 * spread_n +
      0.2 * p_dev +
      0.4 * h * c +
      0.2 * w * c;

    s *= coastal * inland * (1 - alt / 1000 * 0.05) * (1 + 0.002 * (lat - 35));
    return Math.min(3, s);
  }

  function labelFromS(S, rain) {
    if (rain > 0.3) return "비";
    if (S < 0.3) return "맑음";
    if (S < 0.6) return "구름 많음";
    if (S < 0.8) return "대체로 흐림";
    return "흐림";
  }

  function rainCorrection(rain, chance, humidity, cloud) {
    if (rain < 0.3 && chance <= 15) {
      if (humidity > 80 && cloud > 70) return 0.2; // 약한 가능성
      return 0; // 거의 없음
    }
    return rain;
  }

  async function fetchWeather(cityKo) {
    try {
      const { name_en, lat, lon, alt } = CITY[cityKo];
      const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${lat},${lon}&days=10&aqi=no&alerts=no&lang=ko`;
      const res = await fetch(url);
      const data = await res.json();

      const localEpoch = data.location.localtime_epoch;
      const hours = data.forecast.forecastday[0].hour;

      // ✅ 현재 시각 기준으로 연속 12시간 추출 (보간)
      const next12 = [];
      for (let i = 0; i < 12; i++) {
        const targetEpoch = localEpoch + i * 3600; // +1시간 단위
        const closest = hours.reduce((a, b) =>
          Math.abs(new Date(a.time_epoch * 1000) - targetEpoch * 1000) <
          Math.abs(new Date(b.time_epoch * 1000) - targetEpoch * 1000)
            ? a
            : b
        );
        const rain = rainCorrection(
          closest.precip_mm ?? 0,
          closest.chance_of_rain ?? 0,
          closest.humidity,
          closest.cloud
        );
        const S = computeSPlus({
          temp: closest.temp_c,
          humidity: closest.humidity,
          wind: closest.wind_kph,
          cloud: closest.cloud,
          dewpoint: closest.dewpoint_c,
          pressure: closest.pressure_mb,
          lat,
          alt,
          cityName: cityKo,
        });
        next12.push({
          time: new Date(closest.time).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          temp: closest.temp_c,
          humidity: closest.humidity,
          condition: labelFromS(S, rain),
        });
      }

      const days = data.forecast.forecastday.map((d) => ({
        date: d.date,
        condition: d.day.condition.text,
        max: d.day.maxtemp_c,
        min: d.day.mintemp_c,
        humidity: d.day.avghumidity,
      }));

      setHourly(next12);
      setForecast(days);
      const Smean =
        days.reduce(
          (a, d) =>
            a +
            computeSPlus({
              temp: d.max,
              humidity: d.humidity,
              wind: 10,
              cloud: 50,
              lat,
              alt,
              cityName: cityKo,
            }),
          0
        ) / days.length;
      setStatus(
        Smean < 0.4
          ? "안정 — 대체로 맑음"
          : Smean < 0.7
          ? "평형 — 구름 많음"
          : "활성 — 흐림 또는 비"
      );
    } catch (err) {
      console.error(err);
      setStatus("데이터 불러오기 실패");
    }
  }

  useEffect(() => {
    fetchWeather(city);
  }, [city]);

  // === 렌더링 ===
  return (
    <div className="App">
      <h1>S-Forecast ver.2.8r — Real-Time 12h Precision Edition</h1>

      <select value={city} onChange={(e) => setCity(e.target.value)}>
        {Object.keys(CITY).map((name) => (
          <option key={name}>{name}</option>
        ))}
      </select>

      <h3>실시간 12시간 리듬 예보 — {city}</h3>
      <div className="hourly-grid">
        {hourly.map((h, i) => (
          <div key={i} className="hour-cell">
            <p>{h.time}</p>
            <p>{h.temp.toFixed(1)}°C / {h.humidity}%</p>
            <p>{h.condition}</p>
          </div>
        ))}
      </div>

      <h3>10일 예보 — {city}</h3>
      <table className="forecast-table">
        <thead>
          <tr>
            <th>날짜</th>
            <th>상태</th>
            <th>최고 / 최저</th>
            <th>습도</th>
          </tr>
        </thead>
        <tbody>
          {forecast.map((d, i) => (
            <tr key={i}>
              <td>{d.date}</td>
              <td>{d.condition}</td>
              <td>{Math.round(d.max)}° / {Math.round(d.min)}°</td>
              <td>{Math.round(d.humidity)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="status">{status}</p>
      <footer><p>Glitch Factory — Adaptive Navier Rhythm Model</p></footer>
    </div>
  );
}
