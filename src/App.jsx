import React, { useEffect, useState } from "react";
import "./App.css";

export default function App() {
  // 도시 정보 (위도·경도 직접 지정)
  const cities = [
    { name: "서울", lat: 37.5665, lon: 126.9780 },
    { name: "수원", lat: 37.2636, lon: 127.0286 },
    { name: "안산", lat: 37.3219, lon: 126.8309 },
    { name: "안양", lat: 37.3943, lon: 126.9568 },
    { name: "강릉", lat: 37.7519, lon: 128.8761 },
    { name: "부산", lat: 35.1796, lon: 129.0756 },
    { name: "오사카", lat: 34.6937, lon: 135.5023 },
    { name: "후쿠오카", lat: 33.5902, lon: 130.4017 },
    { name: "유후인", lat: 33.2659, lon: 131.3461 },
    { name: "나고야", lat: 35.1815, lon: 136.9066 },
    { name: "마쓰야마", lat: 33.8393, lon: 132.7657 },
  ];

  const [city, setCity] = useState(cities[1]); // 기본: 수원
  const [forecast, setForecast] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [current, setCurrent] = useState(null);
  const [status, setStatus] = useState("");

  const alpha = 0.82, beta = 0.68, gamma = 0.03, kappa = 1.45, dt = 0.01;

  useEffect(() => {
    fetchWeather(city);
  }, [city]);

  async function fetchWeather(cityObj) {
    try {
      const apiKey = "8370f7e693e34a79bdd180327252510";
      const { lat, lon } = cityObj;
      const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${lat},${lon}&days=7&aqi=no&alerts=no&lang=ko`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data || !data.forecast?.forecastday) {
        setForecast([]);
        setStatus("데이터 없음");
        return;
      }

      setForecast(data.forecast.forecastday);
      setCurrent(data.current);

      // 리듬 상태 계산
      const rhythm = computeRhythm(data.forecast.forecastday);
      setStatus(rhythm);

      // 현재시간~6시간 앞까지만 추출
      const nowHour = new Date().getHours();
      const next6h = data.forecast.forecastday[0].hour.filter(h => {
        const hour = new Date(h.time).getHours();
        return hour >= nowHour && hour < nowHour + 6;
      });

      // 시간별 리듬 계산
      const hourlyPred = next6h.map(h => ({
        time: h.time.slice(-5),
        temp: h.temp_c,
        humidity: h.humidity,
        condition: labelFromS(
          computeS({
            temp: h.temp_c,
            humidity: h.humidity,
            wind: h.wind_kph ?? 0,
            cloud: h.cloud ?? 0,
            lat,
          }),
          "default",
          false
        ),
      }));
      setHourly(hourlyPred);

    } catch (e) {
      console.error("Weather fetch error:", e);
      setStatus("데이터 불러오기 실패");
    }
  }

  // === 나비에 리듬 계산 ===
  function computeS({ temp, humidity, wind = 0, cloud = 0, lat = 35 }) {
    const t = (temp - 15) / 12;
    const h = (humidity - 60) / 20;
    const w = (wind - 10) / 10;
    const c = (cloud - 50) / 50;
    const diurnal = Math.sin(temp / 7) * 0.6;
    const interact = 0.4 * h * c + 0.25 * w * c;
    let s = Math.abs(0.9 * diurnal + 0.7 * h + 0.5 * c + 0.4 * w + interact);
    s *= 1 + 0.002 * (lat - 35);
    return Math.min(3, s * 1.2);
  }

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

  function computeRhythm(days) {
    const temps = days.map(d => d.day.avgtemp_c);
    const hums = days.map(d => d.day.avghumidity);
    const winds = days.map(d => d.day.maxwind_kph);
    const n = temps.length;
    const normT = temps.map(t => (t - Math.min(...temps)) / (Math.max(...temps) - Math.min(...temps) + 1e-6));
    const normH = hums.map(h => h / 100);
    const normW = winds.map(w => w / Math.max(...winds));
    let rho = 0.5, S = 0.0;
    for (let i = 0; i < n; i++) {
      const T = normT[i], H = normH[i], W = normW[i];
      const α = alpha + 0.2 * (T - 0.5);
      const β = beta + 0.1 * (H - 0.5);
      const η = 0.05 + 0.1 * W;
      const lam_up = α * rho, lam_down = β * (1 - rho);
      const drho = -gamma * rho + (lam_up - lam_down) * rho - η * Math.max(0, rho - 0.4);
      rho += drho * dt;
      const dS = (lam_up - lam_down) * kappa;
      S += dS * dt;
    }
    const ratio = (S - 0.5) * 2.2;
    if (ratio < -0.5) return "안정 — 대체로 맑음";
    if (ratio < 0.2) return "평형 — 구름 많음";
    if (ratio < 0.8) return "불안정 — 오후 한때 소나기 가능";
    return "활성 — 비 또는 흐림";
  }

  return (
    <div className="App">
      <h1>S-Forecast ver.2.6p-6h</h1>

      <div className="selector">
        <label>도시 선택: </label>
        <select
          value={city.name}
          onChange={(e) =>
            setCity(cities.find((c) => c.name === e.target.value))
          }
        >
          {cities.map((c) => (
            <option key={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* 실시간 리듬 예보 */}
      <h2>6시간 리듬 예보</h2>
      <div className="hourly">
        {hourly.map((h, i) => (
          <div className="hour-box" key={i}>
            <p className="tiny">{h.time}</p>
            <p>{h.temp.toFixed(1)}°C / {h.humidity}%</p>
            <p className="tiny">{h.condition}</p>
          </div>
        ))}
      </div>

      {/* 일간 예보 */}
      <h2>7일 예보 — {city.name}</h2>
      <table className="forecast">
        <thead>
          <tr>
            <th>날짜</th>
            <th>날씨</th>
            <th>최고/최저</th>
          </tr>
        </thead>
        <tbody>
          {forecast.map((day) => (
            <tr key={day.date}>
              <td>{new Date(day.date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</td>
              <td>{day.day.condition.text}</td>
              <td>{Math.round(day.day.maxtemp_c)}° / {Math.round(day.day.mintemp_c)}°</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer>
        <p>Glitch Factory — Adaptive Navier Model</p>
      </footer>
    </div>
  );
}
