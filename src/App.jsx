import React, { useState, useEffect } from "react";
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

// ──────────────────────────────
//  나비에 리듬 계산
// ──────────────────────────────
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

// ──────────────────────────────
//  자연어 라벨
// ──────────────────────────────
function labelFromS(S, season = "default", isDaily = false) {
  if (!isDaily) {
    if (S < 0.4) return "맑음";
    if (S < 0.75) return "흐림";
    return "비";
  }
  if (S < 0.3) return "맑음";
  if (S < 0.45) return "대체로 맑음";
  if (S < 0.6) return "가끔 구름 많음";
  if (S < 0.75) return "대체로 흐림";
  if (S < 0.9) return "비 또는 소나기";
  return season === "winter" ? "비 또는 눈" : "비 또는 천둥";
}

// ──────────────────────────────
//  메인 컴포넌트
// ──────────────────────────────
export default function App() {
  const [selectedCity, setSelectedCity] = useState("서울");
  const [forecast, setForecast] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [today, setToday] = useState("");

  useEffect(() => {
    fetchWeather(selectedCity);
  }, [selectedCity]);

  const fetchWeather = async (city) => {
    try {
      const cityQuery = cities.find((c) => c.name === city)?.query;
      const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${cityQuery}&days=7&lang=ko`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.forecast) return;

      const hours = data.forecast.forecastday[0].hour;
      const hourlyCalc = hours.map((h) => {
        const S = computeS({
          temp: h.temp_c,
          humidity: h.humidity,
          wind: h.wind_kph ?? 0,
          cloud: h.cloud ?? (h.condition?.code ? 60 : 0),
        });
        return { time: h.time.slice(-5), S, humidity: h.humidity };
      });

      const th = thresholdsFromS(hourlyCalc.map((x) => x.S));
      setHourly(
        hourlyCalc.map((h) => ({
          time: h.time,
          humidity: h.humidity,
          condition: labelFromS(h.S, "default", false),
        }))
      );

      const α = 2.6,
        β = 1.8;
      const daily = data.forecast.forecastday.map((d) => {
        const dayHours = d.hour?.length ? d.hour : hours;
        const dayS = dayHours.map((h) =>
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
        const cond = labelFromS(Smean, "default", true);

        return {
          date: d.date,
          avgtemp: tAvg.toFixed(1),
          maxtemp: tMax,
          mintemp: tMin,
          humidity: d.day.avghumidity,
          condition: cond,
        };
      });

      setForecast(daily);
      setToday(data.forecast.forecastday[0].date);
    } catch (e) {
      console.error("API 오류:", e);
    }
  };

  return (
    <div className="App">
      <h1>S-Forecast (Adaptive Navier Model)</h1>

      <div className="selector">
        <label>도시 선택: </label>
        <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
          {cities.map((c) => (
            <option key={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      <h2>리듬 예보</h2>
      <p className="date-label">{today}</p>
      <div className="hourly">
        {hourly.slice(0, 12).map((h, i) => (
          <div className="hour-box" key={i}>
            <p className="tiny">{h.time}</p>
            <p>{h.humidity}%</p>
            <p className="tiny">{h.condition}</p>
          </div>
        ))}
      </div>

      <h2>7일 예보</h2>
      <table>
        <thead>
          <tr>
            <th>날짜</th>
            <th>상태</th>
            <th>평균 (°C)</th>
            <th>최고</th>
            <th>최저</th>
            <th>습도 (%)</th>
          </tr>
        </thead>
        <tbody>
          {forecast.map((d, i) => (
            <tr key={i}>
              <td>{d.date}</td>
              <td>{d.condition}</td>
              <td>{d.avgtemp}</td>
              <td>{d.maxtemp}</td>
              <td>{d.mintemp}</td>
              <td>{d.humidity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer>
        Glitch Factory | S-Forecast ver.2.4n — Natural Language Edition
      </footer>
    </div>
  );
}
