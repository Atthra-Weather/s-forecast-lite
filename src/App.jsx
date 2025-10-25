import React, { useEffect, useState } from "react";
import "./App.css";

const API_KEY = "8370f7e693e34a79bdd180327252510";
const cities = [
  { name: "서울", query: "Seoul" },
  { name: "수원", query: "Suwon" },
  { name: "안산", query: "Ansan" },
  { name: "안양", query: "Anyang" },
  { name: "인천", query: "Incheon" },
  { name: "강릉", query: "Gangneung" },
  { name: "부산", query: "Busan" },
  { name: "도쿄", query: "Tokyo" },
  { name: "오사카", query: "Osaka" },
  { name: "후쿠오카", query: "Fukuoka" },
  { name: "마쓰야마", query: "Matsuyama" },
];

// -------- Navier Rhythm Model -------- //
function computeS({ temp, humidity, wind = 0, cloud = 0 }) {
  const t = (temp - 15) / 12;
  const h = (humidity - 60) / 20;
  const w = (wind - 10) / 10;
  const c = (cloud - 50) / 50;

  const diurnal = Math.sin(temp / 7) * 0.6;
  const interact = 0.4 * h * c + 0.25 * w * c;
  const s = Math.abs(0.9 * diurnal + 0.7 * h + 0.5 * c + 0.4 * w + interact);
  return Math.min(3, s * 1.2);
}

function thresholdsFromS(hourlyS) {
  const sorted = [...hourlyS].sort((a, b) => a - b);
  const q = (p) => sorted[Math.floor((sorted.length - 1) * p)];
  return { q30: q(0.3), q70: q(0.7) };
}

function labelFromS(S, th) {
  if (S <= th.q30) return "맑음";
  if (S <= th.q70) return "흐림";
  return "비";
}
// ------------------------------------ //

export default function App() {
  const [city, setCity] = useState(cities[0]);
  const [hourly, setHourly] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [status, setStatus] = useState("평형");

  useEffect(() => {
    async function fetchData() {
      const res = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${city.query}&days=7&aqi=no&alerts=no`
      );
      const data = await res.json();
      const today = data.forecast.forecastday[0];

      const hours = today.hour.map((h) => {
        const S = computeS({
          temp: h.temp_c,
          humidity: h.humidity,
          wind: h.wind_kph ?? 0,
          cloud: h.cloud ?? 0,
        });
        return { time: h.time.slice(-5), S, humidity: h.humidity, temp: h.temp_c, cloud: h.cloud };
      });

      const th = thresholdsFromS(hours.map((x) => x.S));
      const labeled = hours.map((h) => ({
        ...h,
        condition: labelFromS(h.S, th),
      }));
      setHourly(labeled);

      const α = 2.6, β = 1.8;
      const daily = data.forecast.forecastday.map((d) => {
        const dayS = d.hour.map((h) =>
          computeS({
            temp: h.temp_c,
            humidity: h.humidity,
            wind: h.wind_kph ?? 0,
            cloud: h.cloud ?? 0,
          })
        );
        const dayTh = thresholdsFromS(dayS);
        const Smean = dayS.reduce((a, b) => a + b, 0) / dayS.length;
        const tAvg = d.day.avgtemp_c;
        const tMax = (tAvg + α * Smean).toFixed(1);
        const tMin = (tAvg - β * Smean).toFixed(1);
        const cond = labelFromS(Smean, dayTh);
        return {
          date: d.date,
          avg: tAvg.toFixed(1),
          max: tMax,
          min: tMin,
          humidity: d.day.avghumidity,
          condition: cond,
        };
      });
      setForecast(daily);

      const meanS = hours.reduce((a, b) => a + b.S, 0) / hours.length;
      if (meanS < th.q30) setStatus("안정 ☀️");
      else if (meanS < th.q70) setStatus("약간 불안정 🌤");
      else setStatus("불안정 🌧");
    }

    fetchData();
  }, [city]);

  const todayDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="App">
      <h1>S-Forecast · Navier Model</h1>

      <div className="selector">
        <label>도시 선택: </label>
        <select onChange={(e) => setCity(cities.find((c) => c.name === e.target.value))}>
          {cities.map((c) => (
            <option key={c.query}>{c.name}</option>
          ))}
        </select>
      </div>

      <h2>실시간 리듬 예보</h2>
      <p className="date-label">{todayDate}</p>
      <h3>{status}</h3>

      <p className="desc">리듬이 평형 상태입니다. 대체로 맑고 고요한 날씨가 예상됩니다.</p>

      <div className="hourly">
        {hourly.map((h, i) => (
          <div key={i} className="hour-box">
            <p>{h.time}</p>
            <p className="tiny">{h.humidity}%</p>
            <p className="tiny">{h.condition}</p>
          </div>
        ))}
      </div>

      <h2>7일 리듬 예보</h2>
      <table>
        <thead>
          <tr>
            <th>날짜</th>
            <th>날씨</th>
            <th>평균(℃)</th>
            <th>최고</th>
            <th>최저</th>
            <th>습도(%)</th>
          </tr>
        </thead>
        <tbody>
          {forecast.map((d, i) => (
            <tr key={i}>
              <td>{d.date}</td>
              <td>{d.condition}</td>
              <td>{d.avg}</td>
              <td>{d.max}</td>
              <td>{d.min}</td>
              <td>{d.humidity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer>© 2025 Glitch Factory · S-Forecast Navier Model ver.2.3</footer>
    </div>
  );
}
