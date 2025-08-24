// ===================================================================
// =================== לוח הבקרה וההגדרות ===================
// ===================================================================

const SETTINGS = {
    // הגדר את המיקום שלך (קו רוחב ואורך)
    location: {
        lat: 31.778, // לדוגמה, ירושלים
        lon: 35.235  // לדוגמה, ירושלים
    },

    // בחר אילו זמנים להציג. העתק והדבק מהרשימה שבהמשך.
    zmanimToShow: [
        "alotHaShachar",
        "sofZmanShma",
        "sofZmanTfilla",
        "chatzot",
        "minchaGedola",
        "plagHaMincha",
        "shkiah",
        "tzeit7083degs"
    ]
};

/*
   רשימת הזמנים האפשריים להעתקה:
   "chatzotNight"    (חצות הלילה)
   "alotHaShachar"   (עלות השחר)
   "sofZmanShma"     (סוף זמן ק"ש)
   "sofZmanTfilla"   (סוף זמן תפילה)
   "chatzot"         (חצות היום)
   "minchaGedola"    (מנחה גדולה)
   "minchaKetana"    (מנחה קטנה)
   "plagHaMincha"    (פלג המנחה)
   "shkiah"          (שקיעת החמה)
   "tzeit7083degs"   (צאת הכוכבים)
*/

// ===================================================================
// =================== סוף אזור ההגדרות ===================
// ===================================================================


document.addEventListener('DOMContentLoaded', () => {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error-message');
    const clockViewEl = document.getElementById('clock-view');

    // טוען את קובץ ה-CSV המקומי
    fetch('sunrise_data.csv')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(csvText => {
            const parseResult = Papa.parse(csvText, { header: true, skipEmptyLines: true });
            if (parseResult.errors.length > 0) {
                 throw new Error('Error parsing CSV file');
            }
            loadingEl.classList.add('hidden');
            clockViewEl.classList.remove('hidden');
            runClock(parseResult.data);
        })
        .catch(err => {
            console.error("Failed to load or parse sunrise_data.csv:", err);
            loadingEl.classList.add('hidden');
            errorEl.classList.remove('hidden');
        });

    function runClock(sunriseData) {
        const zmanimNames = {
            chatzotNight: 'חצות הלילה', alotHaShachar: 'עלות השחר', tzeit7083degs: 'צאת הכוכבים',
            sofZmanShma: 'סוף זמן ק"ש', sofZmanTfilla: 'סוף זמן תפילה', chatzot: 'חצות היום',
            minchaGedola: 'מנחה גדולה', minchaKetana: 'מנחה קטנה', plagHaMincha: 'פלג המנחה',
            shkiah: 'שקיעת החמה'
        };

        const mainDisplay = document.getElementById('main-display');
        const secondaryDisplay = document.getElementById('secondary-display');
        const currentTimeSmall = document.getElementById('current-time-small');
        const sunriseTimeSmall = document.getElementById('sunrise-time-small');
        const hebrewDateEl = document.getElementById('hebrew-date');
        const zmanimListEl = document.getElementById('zmanim-list');

        const HDate = Hebcal.HDate;
        const Location = Hebcal.Location;
        const Zmanim = Hebcal.Zmanim;
        
        const loc = new Location(SETTINGS.location.lat, SETTINGS.location.lon, true, 'Asia/Jerusalem');
        const formatTime = (date) => date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

        function getSunriseTime(date) {
            const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const found = sunriseData.find(row => row.Date === dateString);
            if (found && found.Sunrise) {
                const [h, m, s] = found.Sunrise.split(':');
                const sunriseDate = new Date(date);
                sunriseDate.setHours(h, m, s, 0);
                return sunriseDate;
            }
            // Fallback to calculation if date not in CSV
            console.warn(`Sunrise for ${dateString} not found in CSV. Calculating fallback.`);
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
            
            SETTINGS.zmanimToShow.forEach(zmanKey => {
                const zmanTime = zmanim[zmanKey];
                if (zmanTime) {
                    const div = document.createElement('div');
                    div.innerHTML = `<span class="zman-name">${zmanimNames[zmanKey]}: </span><span class="zman-time">${formatTime(zmanTime)}</span>`;
                    zmanimListEl.appendChild(div);
                }
            });
        }
        
        displayStaticInfo();
        setInterval(updateClock, 1000);
        updateClock();
    }
});
