import React, { useEffect, useState } from "react";

export default function WeatherApp() {
  const [city, setCity] = useState("서울");
  const [data, setData] = useState([]);
  const [current, setCurrent] = useState(null);

  const cities = [
    "서울", "안산", "안양", "용인", "수원", "인천", "강릉", "부산",
    "오사카", "후쿠오카", "유후인", "마쓰야마", "사포로", "나고야"
  ];

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          `https://api.weatherapi.com/v1/forecast.json?key=YOUR_API_KEY&q=${city}&hours=24&lang=ko`
        );
        const json = await res.json();

        // 현재 날씨 요약
        setCurrent({
          temp: Math.round(json.current.temp_c),
          feels: Math.round(json.current.feelslike_c),
          condition: json.current.condition.text,
          humidity: json.current.humidity,
          wind: json.current.wind_kph,
          icon: getWeatherIcon(json.current.condition.text),
        });

        // 시간별 예보
        const hourly = json.forecast.forecastday[0].hour.map((h) => ({
          time: `${new Date(h.time).getHours()}시`,
          icon: getWeatherIcon(h.condition.text),
          temp: `${Math.round(h.temp_c)}°`,
          rain: `${h.chance_of_rain}%`,
          humidity: `${h.humidity}%`,
        }));
        setData(hourly);
      } catch (err) {
        console.error(err);
      }
    };
    fetchWeather();
  }, [city]);

  const getWeatherIcon = (text) => {
    const t = text.toLowerCase();
    if (t.includes("rain") || t.includes("비")) return "🌧";
    if (t.includes("cloud") || t.includes("구름")) return "☁️";
    if (t.includes("snow") || t.includes("눈")) return "❄️";
    if (t.includes("sun") || t.includes("clear") || t.includes("맑")) return "☀️";
    return "🌤";
  };

  return (
    <div className="bg-black text-white min-h-screen p-4 font-sans">
      <h1 className="text-xl font-bold mb-3">S-Forecast Lite</h1>

      {/* 도시 선택 */}
      <select
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className="bg-gray-800 text-white p-2 rounded mb-4"
      >
        {cities.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>

      {/* 현재 날씨 카드 */}
      {current && (
        <div className="bg-gray-900 p-4 rounded-lg mb-4 flex flex-col items-center">
          <div className="text-5xl mb-2">{current.icon}</div>
          <div className="text-3xl font-bold mb-1">
            {city} | {current.temp}°C
          </div>
          <div className="text-sm text-gray-300 mb-1">
            체감 {current.feels}°C · {current.condition}
          </div>
          <div className="text-xs text-gray-400">
            습도 {current.humidity}% · 바람 {current.wind}km/h
          </div>
        </div>
      )}

      {/* 시간별 날씨 표 */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-center border-collapse">
          <thead>
            <tr className="border-b border-gray-700 text-gray-300 text-sm">
              <th>시간</th>
              <th>날씨</th>
              <th>기온(°C)</th>
              <th>강수확률(%)</th>
              <th>습도(%)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-gray-800 text-sm">
                <td>{row.time}</td>
                <td>{row.icon}</td>
                <td>{row.temp}</td>
                <td>{row.rain}</td>
                <td>{row.humidity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-center text-xs text-gray-600 mt-6">
        데이터 제공: WeatherAPI.com | GlitchFactory S-Forecast Model
      </p>
    </div>
  );
}
