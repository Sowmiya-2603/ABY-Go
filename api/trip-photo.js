// Vercel serverless function: looks up one destination photo via
// SerpApi's Google Images API (https://serpapi.com/google-images-api).
// SerpApi blocks browser calls on purpose (the key must stay secret),
// so the page calls THIS endpoint and the key lives in a Vercel
// environment variable named SERPAPI_KEY
// (Vercel dashboard -> Project -> Settings -> Environment Variables).
export default async function handler(req, res) {
  const q = String(req.query.q || "").slice(0, 100);
  const key = process.env.SERPAPI_KEY;

  if (!q) return res.status(400).json({ error: "missing q" });
  if (!key) return res.status(503).json({ error: "SERPAPI_KEY not set" });

  try {
    const response = await fetch(
      "https://serpapi.com/search.json?engine=google_images&q=" +
        encodeURIComponent(q) + "&api_key=" + key
    );
    if (!response.ok) {
      return res.status(502).json({ error: "serpapi " + response.status });
    }
    const data = await response.json();
    const img = (data.images_results || [])[0];
    if (!img) return res.status(404).json({ error: "no image" });

    // Let Vercel's CDN remember the answer for a day, so repeat
    // visitors don't burn through the SerpApi monthly quota.
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");
    return res.status(200).json({
      url: img.original || img.thumbnail,
      // The thumbnail is served by Google and always hotlinks fine;
      // the original sometimes refuses, so the page keeps it as a spare.
      fallback: img.thumbnail || "",
      credit: "Photo: " + (img.source || "Google Images"),
    });
  } catch (error) {
    return res.status(502).json({ error: "lookup failed" });
  }
}
