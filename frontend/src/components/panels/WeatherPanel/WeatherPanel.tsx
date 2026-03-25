import { useWeather } from '../../../hooks/useWeather';
import { usePanelContext } from '../../PanelWrapper/PanelWrapper';
import styles from './WeatherPanel.module.css';

export default function WeatherPanel() {
  const { data, error, isLoading } = useWeather();
  const { isFocused } = usePanelContext();

  if (isLoading) return <span className={styles.meta}>Loading…</span>;
  if (error || !data) return <span className={styles.meta}>Unavailable</span>;

  return (
    <div className={styles.container}>
      {/* Always-visible summary */}
      <div className={styles.summary}>
        {data.icon && (
          <img
            src={`https://openweathermap.org/img/wn/${data.icon}@2x.png`}
            alt={data.description}
            className={styles.icon}
            width={52}
            height={52}
          />
        )}
        <div>
          <div className={styles.temp}>{data.temperature}°</div>
          <div className={styles.city}>{data.city}</div>
        </div>
      </div>

      {/* Detail rows + forecast — only visible when expanded */}
      {isFocused && (
        <div className={styles.details}>
          <div className={styles.description}>{data.description}</div>
          <div className={styles.detailGrid}>
            <span className={styles.label}>Feels like</span>
            <span>{data.feelsLike}°</span>
            <span className={styles.label}>Humidity</span>
            <span>{data.humidity}%</span>
            <span className={styles.label}>Wind</span>
            <span>{data.windSpeed} m/s</span>
          </div>
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
                      width={32}
                      height={32}
                    />
                  )}
                  <span className={styles.forecastMax}>{day.tempMax}°</span>
                  <span className={styles.forecastMin}>{day.tempMin}°</span>
                </div>
              ))}
            </div>
          )}
          <div className={styles.updated}>
            Updated{' '}
            {new Date(data.updatedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      )}
    </div>
  );
}
