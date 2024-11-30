import React, { useEffect, useState } from 'react';

const MusicHeatmap = () => {
  const [data, setData] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, content: '', x: 0, y: 0 });

  const fetchAllTracks = async () => {
    const limit = 1000;
    const user = process.env.REACT_APP_LASTFM_USER;
    const apiKey = process.env.REACT_APP_LASTFM_API_KEY;
    const baseUrl = 'https://ws.audioscrobbler.com/2.0/';
    const method = 'user.getRecentTracks';
    let page = 1;
    let allTracks = [];

    if (!user || !apiKey) {
      setError('Missing API key or user in environment variables');
      return [];
    }

    try {
      const initialResponse = await fetch(`${baseUrl}?method=${method}&user=${user}&api_key=${apiKey}&format=json&limit=${limit}&page=${page}`);
      const initialData = await initialResponse.json();

      if (initialData.recenttracks && initialData.recenttracks.track) {
        allTracks = [...initialData.recenttracks.track];
        const totalPages = parseInt(initialData.recenttracks['@attr'].totalPages, 10);

        const fetchPromises = [];
        for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
          fetchPromises.push(
            fetch(`${baseUrl}?method=${method}&user=${user}&api_key=${apiKey}&format=json&limit=${limit}&page=${currentPage}`)
              .then((res) => res.json())
              .then((pageData) => {
                setLoadingProgress((currentPage / totalPages) * 100);
                return pageData;
              })
          );
        }

        const allPagesData = await Promise.all(fetchPromises);
        allPagesData.forEach((pageData) => {
          if (pageData.recenttracks && pageData.recenttracks.track) {
            allTracks = [...allTracks, ...pageData.recenttracks.track];
          }
        });
      }

      return allTracks.filter((track) => {
        if (track.date) {
          const year = new Date(track.date.uts * 1000).getFullYear();
          return year === 2024;
        }
        return false;
      });
    } catch (err) {
      console.error('Error fetching tracks:', err);
      setError('Failed to fetch data. Please try again later.');
      return [];
    }
  };

  const organizeTracksByDate = (tracks) => {
    const organized = {};
    tracks.forEach((track) => {
      if (!track.date) return;
      const date = new Date(track.date.uts * 1000);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      if (year !== 2024) return;

      if (!organized[year]) organized[year] = {};
      if (!organized[year][month]) organized[year][month] = {};
      if (!organized[year][month][day]) {
        organized[year][month][day] = {
          totalSongs: 0,
          mostPlayedSong: track.name,
        };
      }

      organized[year][month][day].totalSongs += 1;
    });
    return organized;
  };

  useEffect(() => {
    const fetchAndOrganizeData = async () => {
      const allTracks = await fetchAllTracks();
      const organizedData = organizeTracksByDate(allTracks);
      setData(organizedData);
    };

    fetchAndOrganizeData();
  }, []);

  const handleMouseOver = (e, dayData, month, day, year) => {
    setTooltip({
      visible: true,
      content: `Date: ${month}/${day}/${year}\nTotal Songs: ${dayData.totalSongs}\nMost Played: ${dayData.mostPlayedSong}`,
      x: e.pageX + 10,
      y: e.pageY + 10,
    });
  };

  const handleMouseOut = () => {
    setTooltip({ visible: false, content: '', x: 0, y: 0 });
  };

  if (error) return <div>{error}</div>;
  if (!data) return <div>Loading... {Math.round(loadingProgress)}%</div>;

  const years = Object.keys(data).sort((a, b) => parseInt(a) - parseInt(b));

  const styles = {
    container: {
      fontFamily: 'Arial, sans-serif',
      margin: '20px auto',
      padding: '20px',
      maxWidth: '900px',
      backgroundColor: '#ffffff',
      borderRadius: '10px',
      boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
    },
    header: {
      textAlign: 'center',
      marginBottom: '20px',
    },
    monthsGrid: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '15px',
      justifyContent: 'center',
    },
    month: {
      width: '150px',
      display: 'flex',
      flexDirection: 'column',
    },
    monthName: {
      fontSize: '12px',
      fontWeight: 'bold',
      marginBottom: '5px',
      textAlign: 'center',
    },
    days: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '5px',
    },
    day: (intensityLevel) => ({
      width: '100%',
      paddingTop: '100%',
      position: 'relative',
      borderRadius: '3px',
      backgroundColor: {
        level1: '#d4e157',
        level2: '#aed581',
        level3: '#81c784',
        level4: '#4caf50',
        level5: '#2e7d32',
      }[intensityLevel],
      cursor: 'pointer',
    }),
    tooltip: {
      position: 'absolute',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: '#fff',
      padding: '5px 10px',
      borderRadius: '4px',
      fontSize: '12px',
      whiteSpace: 'pre-line',
      zIndex: 1000,
    },
  };

  return (
    <div style={styles.container}>
      {years.map((year) => {
        const months = Object.keys(data[year]).sort((a, b) => parseInt(a) - parseInt(b));
        return (
          <div key={year}>
            <h1 style={styles.header}>My Year in Music - {year}</h1>
            <div style={styles.monthsGrid}>
              {months.map((month) => {
                const days = data[year][month];
                const firstDayOfMonth = new Date(year, parseInt(month) - 1, 1).getDay();
                const orderedDays = Object.keys(days).sort((a, b) => parseInt(a) - parseInt(b));

                return (
                  <div key={month} style={styles.month}>
                    <div style={styles.monthName}>
                      {new Date(year, parseInt(month) - 1).toLocaleString('default', { month: 'long' })}
                    </div>
                    <div style={styles.days}>
                      {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      {orderedDays.map((day) => {
                        const dayData = days[day];
                        let intensityLevel = '';

                        if (dayData.totalSongs < 10) intensityLevel = 'level1';
                        else if (dayData.totalSongs < 20) intensityLevel = 'level2';
                        else if (dayData.totalSongs < 30) intensityLevel = 'level3';
                        else if (dayData.totalSongs < 40) intensityLevel = 'level4';
                        else intensityLevel = 'level5';

                        return (
                          <div
                            key={day}
                            style={styles.day(intensityLevel)}
                            onMouseOver={(e) => handleMouseOver(e, dayData, month, day, year)}
                            onMouseOut={handleMouseOut}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {tooltip.visible && (
        <div
          style={{
            ...styles.tooltip,
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

export default MusicHeatmap;
