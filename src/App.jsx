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

// ✅ 나비에-S 모델 (리듬 분석)
function s_forecast_report(time, tempSeries) {
  if (tempSeries.length < 2) return { state: "데이터 부족", desc: "예보 분석 불가" };
  const mean = tempSeries.reduce((a, b) => a + b, 0) / tempSeries.length;
  const std =
    Math.sqrt(
      tempSeries.map(t => Math.pow(t - mean, 2)).reduce((a, b) => a + b, 0) /
      tempSeries.length
    ) || 1;
  const ratio = (tempSeries[tempSeries.length - 1] - mean) / std;

  let state, desc;
  if (ratio < -0.5) {
    state = "안정 ☀️";
    desc = "리듬이 평형을 유지하고 있습니다. 대체로 맑고 고요한 날씨가 예상됩니다.";
  } else if (ratio < 0.5) {
    state = "평형 🌤";
    desc = "리듬이 완만한 진동 범위 내에 있습니다. 구름 많고 변화가 적은 하루가 예상됩니다.";
  } else if (ratio < 1.5) {
    state = "불안정 🌧";
    desc = "리듬이 상승하고 있습니다. 오후 이후 대류 활동과 국지적 소나기가 가능성 있습니다.";
  } else {
    state = "폭풍 ⚡️";
    desc = "리듬이 격렬하게 교호 중입니다. 강한 비나 돌풍 가능성이 있습니다.";
  }

  return { state, desc };
}

export default function App() {
  const [selectedCity, setSelectedCity] = useState("서울");
  const [hourly, setHourly] = useState([]);
  const [daily, setDaily] = useState([]);
  const [sResult, setSResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWeather(selectedCity);
  }, [selectedCity]);

  const fetchWeather = async (city) => {
    try {
      const query = cityMap[city] || city;
      const res = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${query}&days=10&lang=ko`
      );
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

      const data = await res.json();
      if (!data.forecast || !data.forecast.forecastday)
        throw new Error(`No forecast data for "${query}"`);

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

      // ✅ S-모델 계산
      const tempSeq = hourlyData.map(h => h.temp);
      const timeSeq = hourlyData.map(h => h.time);
      const s_out = s_forecast_report(timeSeq, tempSeq);
      setSResult(s_out);

      setHourly(hourlyData);
      setDaily(dailyData);
      setError(null);
    } catch (err) {
      console.error("❌ Error fetching weather:", err);
      setError(err.message);
      setHourly([]);
      setDaily([]);
      setSResult(null);
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
          {/* ✅ 실시간 리듬 예보 (가운데 정렬) */}
          {sResult && (
            <section className="s-model-section">
              <h2>리듬 예보</h2>
              <p><strong>{sResult.state}</strong></p>
              <p>{sResult.desc}</p>
            </section>
          )}

          {/* ✅ 3시간 간격 실시간 예보 */}
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

          {/* ✅ 10일 예보 */}
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
