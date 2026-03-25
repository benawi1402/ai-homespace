import { useWeather } from '../../../hooks/useWeather';
import styles from './WeatherPanel.module.css';

/** Map OWM icon code prefix → accent colour */
function wxAccent(icon: string): string {
  const code = icon.slice(0, 2);
  if (code === '01') return '#FFB347'; // clear → golden
  if (code === '02' || code === '03' || code === '04') return '#7BA3C8'; // clouds → steel blue
  if (code === '09' || code === '10') return '#5588CC'; // rain → blue
  if (code === '11') return '#9B7FD4'; // thunder → purple
  if (code === '13') return '#AACCEE'; // snow → icy blue
  return '#778899'; // mist / default → slate
}

export default function WeatherPanel() {
  const { data, error, isLoading } = useWeather();

  if (isLoading) return <span className={styles.meta}>Loading…</span>;
  if (error || !data) return <span className={styles.meta}>Unavailable</span>;

  const accent = data.icon ? wxAccent(data.icon) : undefined;

  return (
    <div className={styles.container} style={accent ? { '--wx-accent': accent } as React.CSSProperties : undefined}>
      {/* Hero */}
      <div className={styles.hero}>
        {data.icon ? (
          <div className={styles.iconWrap}>
            <img
              src={`https://openweathermap.org/img/wn/${data.icon}@2x.png`}
              alt={data.description}
              className={styles.icon}
              width={70}
              height={70}
            />
          </div>
        ) : null}
        <div className={styles.heroText}>
          <div className={styles.temp}>{data.temperature}°</div>
          <div className={styles.city}>{data.city}</div>
          <div className={styles.description}>{data.description}</div>
        </div>
      </div>

      {/* Stat chips */}
      <div className={styles.stats}>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>Feels like</span>
          <span className={styles.statValue}>{data.feelsLike}<span className={styles.statUnit}>°</span></span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>Humidity</span>
          <span className={styles.statValue}>{data.humidity}<span className={styles.statUnit}>%</span></span>
          <div className={styles.humidityBar}>
            <div className={styles.humidityFill} style={{ width: `${data.humidity}%` }} />
          </div>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>Wind</span>
          <span className={styles.statValue}>{data.windSpeed}<span className={styles.statUnit}> m/s</span></span>
        </div>
      </div>

      {/* Forecast — fills remaining height */}
      {data.forecast.length > 0 && (
        <div className={styles.forecast}>
          {data.forecast.map((day) => (
            <div key={day.date} className={styles.forecastDay}>
              <span className={styles.forecastDayName}>
                {new Date(day.date + 'T12:00:00').toLocaleDateString([], { weekday: 'short' })}
              </span>
              {day.icon && (
                <img
                  src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
                  alt={day.description}
                  className={styles.forecastIcon}
                  width={50}
                  height={50}
                />
              )}
              {day.description && (
                <span className={styles.forecastDesc}>{day.description}</span>
              )}
              <div className={styles.forecastTemps}>
                <span className={styles.forecastMax}>{day.tempMax}°</span>
                <span className={styles.forecastMin}>{day.tempMin}°</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
