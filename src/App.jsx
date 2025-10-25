import React, { useState, useEffect } from "react";
import "./App.css";

const API_KEY = "8370f7e693e34a79bdd180327252510";

// 도시 한글–영문·위도·고도 매핑
const CITY_MAP = {
  서울: { name: "Seoul", lat: 37.5, alt: 50 },
  수원: { name: "Suwon", lat: 37.3, alt: 45 },
  안산: { name: "Ansan", lat: 37.3, alt: 20 },
  안양: { name: "Anyang", lat: 37.4, alt: 40 },
  인천: { name: "Incheon", lat: 37.4, alt: 30 },
  강릉: { name: "Gangneung", lat: 37.7, alt: 80 },
  부산: { name: "Busan", lat: 35.2, alt: 10 },
  대구: { name: "Daegu", lat: 35.9, alt: 70 },
  광주: { name: "Gwangju", lat: 35.1, alt: 35 },
  대전: { name: "Daejeon", lat: 36.3, alt: 70 },
  제주: { name: "Jeju", lat: 33.5, alt: 20 },
  도쿄: { name: "Tokyo", lat: 35.7, alt: 40 },
  오사카: { name: "Osaka", lat: 34.7, alt: 20 },
  후쿠오카: { name: "Fukuoka", lat: 33.6, alt: 10 },
  마쓰야마: { name: "Matsuyama", lat: 33.8, alt: 50 },
};

// 지역 계수
function regionAlpha(lat, alt) {
  return 1 + 0.002 * (lat - 35) + 0.0005 * (alt - 50);
}

// 시간 보간
function interpolateHourly(data) {
  const result = [];
  for (let i = 0; i < data.length - 1; i++) {
    const a = data[i],
      b = data[i + 1];
    result.push(a);
    const mid = {
      time: a.time,
      temp_c: (a.temp_c + b.temp_c) / 2,
      humidity: (a.humidity + b.humidity) / 2,
      wind_kph: (a.wind_kph + b.wind_kph) / 2,
      cloud: (a.cloud + b.cloud) / 2,
    };
    result.push(mid);
  }
  result.push(data[data.length - 1]);
  return result;
}

// ──────────────── 나비에 리듬 계산 ────────────────
function computeS({ temp, humidity, wind = 0, cloud = 0, observedS = null, lat = 35, alt = 0 }) {
  const t = (temp - 15) / 12;
  const h = (humidity - 60) / 20;
  const w = (wind - 10) / 10;
  const c = (cloud - 50) / 50;
  const diurnal = Math.sin(temp / 7) * 0.6;
  const interact = 0.4 * h * c + 0.25 * w * c;
  let s = Math.abs(0.9 * diurnal + 0.7 * h + 0.5 * c + 0.4 * w + interact);

  // 실측 기반 보정
  if (observedS !== null) {
    const k = 0.3;
    s = s + k * (observedS - s);
  }

  // 지역 계수 적용
  s *= regionAlpha(lat, alt);
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

// ──────────────── 메인 컴포넌트 ────────────────
export default function App() {
  const [selectedCity, setSelectedCity] = useState("서울");
  const [forecast, setForecast] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [today, setToday] = useState("");
  const [nowTime, setNowTime] = useState("");

  useEffect(() => {
    fetchWeather(selectedCity);
  }, [selectedCity]);

  useEffect(() => {
    const updateNow = () => {
      const n = new Date();
      const formatted = `${n.getFullYear()}.${String(
        n.getMonth() + 1
      ).padStart(2, "0")}.${String(n.getDate()).padStart(
        2,
        "0"
      )} ${n.getHours()}:${String(n.getMinutes()).padStart(2, "0")}`;
      setNowTime(formatted);
    };
    updateNow();
    const timer = setInterval(updateNow, 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchWeather = async (city) => {
    try {
      const { name, lat, alt } = CITY_MAP[city] || { name: city, lat: 35, alt: 0 };
      const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${name}&days=7&lang=ko`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.forecast) return;

      const hoursRaw = interpolateHourly(data.forecast.forecastday[0].hour);
      const observed = computeS({
        temp: data.current.temp_c,
        humidity: data.current.humidity,
        wind: data.current.wind_kph,
        cloud: data.current.cloud,
        lat,
        alt,
      });

      const hourlyCalc = hoursRaw.map((h) => {
        const S = computeS({
          temp: h.temp_c,
          humidity: h.humidity,
          wind: h.wind_kph ?? 0,
          cloud: h.cloud ?? (h.condition?.code ? 60 : 0),
          observedS: observed,
          lat,
          alt,
        });
        return { time: h.time.slice(-5), S, humidity: h.humidity };
      });

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
        const dayS = d.hour.map((h) =>
          computeS({
            temp: h.temp_c,
            humidity: h.humidity,
            wind: h.wind_kph ?? 0,
            cloud: h.cloud ?? 0,
            observedS: observed,
            lat,
            alt,
          })
        );
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
      <h1>S-Forecast (High-Precision Navier Model)</h1>

      <p className="time-label">
        {nowTime} — {selectedCity}
      </p>

      <div className="selector">
        <label>도시 선택: </label>
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
        >
          {Object.keys(CITY_MAP).map((c) => (
            <option key={c}>{c}</option>
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

      <h2>7일 예보 — {selectedCity}</h2>
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
        Glitch Factory | S-Forecast ver.2.6n — High-Precision Edition
      </footer>
    </div>
  );
}
