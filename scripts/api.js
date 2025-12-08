// api.js
// Example asynchronous interactions: fetch public holidays and enrich them with Wiki summaries.
// Demonstrates chained fetches and Promise.all.

async function fetchPublicHolidays(year = new Date().getFullYear(), country = 'US') {
  // Using Nager.Date public API (no api-key). Note: CORS may vary.
  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`);
    if (!res.ok) throw new Error('Holidays fetch failed');
    const holidays = await res.json();
    return holidays;
  } catch (e) {
    console.warn('Failed to fetch holidays', e);
    return [];
  }
}

// Sequential: get a short summary for a holiday name using Wikipedia REST API
async function enrichHolidaysWithWiki(holidays = []) {
  const results = [];
  for (const h of holidays.slice(0, 6)) { // limit requests
    try {
      const page = encodeURIComponent(h.localName);
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${page}`);
      const json = res.ok ? await res.json() : null;
      results.push({ ...h, summary: json?.extract || '' });
    } catch (e) {
      results.push({ ...h, summary: '' });
    }
  }
  return results;
}

// Parallel example: fetch multiple images (placeholder) for course cards.
// returns array of urls (using unsplash source)
async function fetchCourseImages(keywords = []) {
  return Promise.all(keywords.map(async (kw) => {
    // Using Unsplash source images (no API key required for simple source)
    return `https://source.unsplash.com/featured/?${encodeURIComponent(kw)}`;
  }));
}
async function loadDailyQuote() {
  try {
    const res = await fetch('https://api.quotable.io/random');
    const data = await res.json();
    const el = document.getElementById('daily-quote');
    if (el) el.textContent = `"${data.content}" — ${data.author}`;
  } catch {
    const el = document.getElementById('daily-quote');
    if (el) el.textContent = 'Stay focused. You got this.';
  }
}
