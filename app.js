// ===================================================================
// ==  הגדרה חשובה: יש להחליף את ה-ID של ה-GIST שלך כאן          ==
// ===================================================================
const GIST_ID = "6b0f7ca69706d7e6cbc7dc51936ef07a";
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.querySelector('.clock-container') ? 'index' : 'admin';

    const zmanimNames = {
        chatzotNight: 'חצות הלילה',
        alotHaShachar: 'עלות השחר',
        tzeit7083degs: 'צאת הכוכבים',
        sofZmanShma: 'סוף זמן ק"ש',
        sofZmanTfilla: 'סוף זמן תפילה',
        chatzot: 'חצות היום',
        minchaGedola: 'מנחה גדולה',
        minchaKetana: 'מנחה קטנה',
        plagHaMincha: 'פלג המנחה',
        shkiah: 'שקיעת החמה',
    };

    if (page === 'index') {
        const loadingEl = document.getElementById('loading');
        const errorEl = document.getElementById('error-message');
        const clockViewEl = document.getElementById('clock-view');

        if (GIST_ID === "YOUR_GIST_ID_HERE") {
            loadingEl.classList.add('hidden');
            errorEl.classList.remove('hidden');
            return;
        }

        fetch(`https://api.github.com/gists/${GIST_ID}`)
            .then(response => response.json())
            .then(gist => {
                const configFile = gist.files['config.json'];
                if (!configFile) {
                    throw new Error("config.json not found in Gist");
                }
                return fetch(configFile.raw_url);
            })
            .then(response => response.json())
            .then(settings => {
                loadingEl.classList.add('hidden');
                clockViewEl.classList.remove('hidden');
                runClock(settings);
            })
            .catch(err => {
                console.error("Failed to load settings:", err);
                loadingEl.classList.add('hidden');
                errorEl.classList.remove('hidden');
            });

        function runClock(settings) {
            const mainDisplay = document.getElementById('main-display');
            const secondaryDisplay = document.getElementById('secondary-display');
            const currentTimeSmall = document.getElementById('current-time-small');
            const sunriseTimeSmall = document.getElementById('sunrise-time-small');
            const hebrewDateEl = document.getElementById('hebrew-date');
            const zmanimListEl = document.getElementById('zmanim-list');

            const HDate = Hebcal.HDate;
            const Location = Hebcal.Location;
            const Zmanim = Hebcal.Zmanim;
            
            const loc = new Location(settings.location.lat, settings.location.lon, true, 'Asia/Jerusalem');
            const formatTime = (date) => date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

            function getSunriseTime(date) {
                if (settings.sunriseData) {
                    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    const found = settings.sunriseData.find(row => row.Date === dateString);
                    if (found && found.Sunrise) {
                        const [h, m, s] = found.Sunrise.split(':');
                        const sunriseDate = new Date(date);
                        sunriseDate.setHours(h, m, s, 0);
                        return sunriseDate;
                    }
                }
                return new Zmanim(date, loc.getLatitude(), loc.getLongitude()).sunrise;
            }

            function updateClock() {
                const now = new Date();
                const sunrise = getSunriseTime(now);
                const diff = sunrise ? sunrise.getTime() - now.getTime() : -1;

                if (diff > 0 && diff <= 3600 * 1000) {
                    const seconds = Math.floor((diff / 1000) % 60);
                    const minutes = Math.floor((diff / (1000 * 60)) % 60);
                    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                    mainDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                    currentTimeSmall.textContent = `שעה: ${formatTime(now)}`;
                    sunriseTimeSmall.textContent = `הנץ: ${formatTime(sunrise)}`;
                    secondaryDisplay.classList.remove('hidden');
                } else {
                    mainDisplay.textContent = formatTime(now);
                    secondaryDisplay.classList.add('hidden');
                }
            }

            function displayStaticInfo() {
                const today = new HDate();
                hebrewDateEl.textContent = today.toString('h');

                const zmanim = new Zmanim(new Date(), loc.getLatitude(), loc.getLongitude());
                zmanimListEl.innerHTML = '';
                
                if(settings.zmanimToShow) {
                    settings.zmanimToShow.forEach(zmanKey => {
                        const zmanTime = zmanim[zmanKey];
                        if (zmanTime) {
                            const div = document.createElement('div');
                            div.innerHTML = `<span class="zman-name">${zmanimNames[zmanKey]}: </span><span class="zman-time">${formatTime(zmanTime)}</span>`;
                            zmanimListEl.appendChild(div);
                        }
                    });
                }
            }
            
            displayStaticInfo();
            setInterval(updateClock, 1000);
            updateClock();
        }

    } else if (page === 'admin') {
        const generateBtn = document.getElementById('generate-config');
        const csvFileInput = document.getElementById('csv-file');
        const csvStatus = document.getElementById('csv-status');
        const outputContainer = document.getElementById('output-container');
        const configOutput = document.getElementById('config-output');
        let parsedCsvData = null;

        csvFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        parsedCsvData = results.data;
                        csvStatus.textContent = `קובץ "${file.name}" פוענח, ${results.data.length} רשומות.`;
                    },
                    error: (error) => {
                        csvStatus.textContent = `שגיאה בפענוח הקובץ: ${error.message}`;
                        parsedCsvData = null;
                    }
                });
            }
        });

        generateBtn.addEventListener('click', () => {
            const settings = {
                password: document.getElementById('password').value || null,
                location: {
                    lat: parseFloat(document.getElementById('latitude').value),
                    lon: parseFloat(document.getElementById('longitude').value)
                },
                zmanimToShow: Array.from(document.querySelectorAll('input[name="zman"]:checked')).map(cb => cb.value),
                sunriseData: parsedCsvData
            };

            if (isNaN(settings.location.lat) || isNaN(settings.location.lon)) {
                alert("קווי הרוחב והאורך אינם תקינים.");
                return;
            }

            configOutput.value = JSON.stringify(settings, null, 2);
            outputContainer.classList.remove('hidden');
            configOutput.select();
        });
    }
});
