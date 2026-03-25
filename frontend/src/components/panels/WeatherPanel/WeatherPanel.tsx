import { useWeather } from '../../../hooks/useWeather';
import styles from './WeatherPanel.module.css';

export default function WeatherPanel() {
  const { data, error, isLoading } = useWeather();

  if (isLoading) return <span className={styles.meta}>Loading…</span>;
  if (error || !data) return <span className={styles.meta}>Unavailable</span>;

  return (
    <div className={styles.container}>
      {/* Hero: icon + big temperature + city */}
      <div className={styles.hero}>
        {data.icon && (
          <img
            src={`https://openweathermap.org/img/wn/${data.icon}@2x.png`}
            alt={data.description}
            className={styles.icon}
            width={80}
            height={80}
          />
        )}
        <div className={styles.heroText}>
          <div className={styles.temp}>{data.temperature}°</div>
          <div className={styles.city}>{data.city}</div>
        </div>
      </div>

      {/* Detail bar: description + feels like / humidity / wind */}
      <div className={styles.details}>
        <span className={styles.description}>{data.description}</span>
        <div className={styles.detailRow}>
          <span className={styles.detailItem}>
            <span className={styles.label}>Feels like</span>&nbsp;{data.feelsLike}°
          </span>
          <span className={styles.detailSep} />
          <span className={styles.detailItem}>
            <span className={styles.label}>Humidity</span>&nbsp;{data.humidity}%
          </span>
          <span className={styles.detailSep} />
          <span className={styles.detailItem}>
            <span className={styles.label}>Wind</span>&nbsp;{data.windSpeed} m/s
          </span>
        </div>
      </div>

      {/* Forecast strip — fills remaining height */}
      {data.forecast.length > 0 && (
        <div className={styles.forecast}>
          {data.forecast.map((day) => (
            <div key={day.date} className={styles.forecastDay}>
              <span className={styles.forecastDayName}>
                {new Date(day.date + 'T12:00:00').toLocaleDateString([], { weekday: 'short' })}
              </span>
              {day.icon && (
                <img
                  src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                  alt={day.description}
                  className={styles.forecastIcon}
                  width={38}
                  height={38}
                />
              )}
              <span className={styles.forecastMax}>{day.tempMax}°</span>
              <span className={styles.forecastMin}>{day.tempMin}°</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
