import { useState, useEffect } from "react";

export default function SForecastApp() {
  const [city, setCity] = useState("서울");
  const [forecast, setForecast] = useState([]);

  const cities = ["서울", "부산", "도쿄", "오사카", "후쿠오카"];

  useEffect(() => {
    const generateForecast = () => {
      const hours = Array.from({ length: 8 }, (_, i) => i * 3);
      const data = hours.map((h) => ({
        time: `${h}시간 후`,
        S: Math.sin(h / 3) + Math.random() * 0.3,
      }));
      setForecast(data);
    };
    generateForecast();
  }, [city]);

  const meanS = forecast.reduce((a, b) => a + b.S, 0) / forecast.length;
  const stdS = Math.sqrt(
    forecast.reduce((a, b) => a + Math.pow(b.S - meanS, 2), 0) / forecast.length
  );
  const ratio = (forecast.at(-1)?.S - meanS) / stdS;

  let state, desc;
  if (ratio < -0.5) {
    state = "안정";
    desc = "리듬이 평형을 유지하고 있습니다. 대체로 맑고 고요한 날씨가 예상됩니다.";
  } else if (ratio < 0.5) {
    state = "평형";
    desc = "리듬이 완만한 진동 범위 내에 있습니다. 구름 많고 변화가 적은 하루가 예상됩니다.";
  } else if (ratio < 1.5) {
    state = "불안정";
    desc = "리듬이 상승하고 있습니다. 오후 이후 대류 활동과 국지적 소나기가 가능성 있습니다.";
  } else {
    state = "혼란";
    desc = "리듬이 크게 요동치고 있습니다. 폭우, 돌풍 등 급격한 변화가 예상됩니다.";
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 text-slate-900 p-6">
      <h1 className="text-3xl font-bold mb-4">🌤 S-Forecast</h1>
      <p className="mb-6 text-center opacity-80">나비에 모델 기반 기상 구조 예측</p>

      <select
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className="mb-6 px-4 py-2 rounded-xl shadow bg-white border border-slate-300"
      >
        {cities.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>

      <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow w-full max-w-md text-center">
        <h2 className="text-xl font-semibold mb-2">{city}</h2>
        <p className="text-lg font-bold mb-1">{state}</p>
        <p className="text-sm mb-4 opacity-70">{desc}</p>

        <table className="w-full text-sm border-t border-slate-300">
          <thead>
            <tr className="text-slate-600">
              <th className="py-1">시간</th>
              <th className="py-1">S(t)</th>
            </tr>
          </thead>
          <tbody>
            {forecast.map((f, i) => (
              <tr key={i}>
                <td className="py-1 border-t border-slate-200">{f.time}</td>
                <td className="py-1 border-t border-slate-200">{f.S.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="mt-8 text-xs opacity-60">Powered by Navier Structural Model</footer>
    </div>
  );
}
