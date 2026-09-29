const fs = require("fs");

const README = "README.md";
const START = "<!-- ON THIS DAY START -->";
const END = "<!-- ON THIS DAY END -->";
const API = "https://en.wikipedia.org/api/rest_v1/feed/onthisday/events";

const groups = [
  ["computer","computing","internet","web browser","browser","programming","software","java","microprocessor","processor","semiconductor","transistor","operating system","linux","unix","apple","microsoft","ibm","intel","google","smartphone","robot","artificial intelligence","machine learning","encryption","database","compiler","network","technology"],
  ["nasa","apollo","voyager","hubble","mars","lunar","moon","spacecraft","space shuttle","astronaut","cosmonaut","satellite","rocket","orbit","space station","iss","telescope","asteroid","comet","jupiter","saturn","venus","mercury","pluto","uranus","neptune","galaxy","supernova","exoplanet","observatory","chandrayaan","isro","spacex","esa"],
  ["discovered","discovery","invented","invention","breakthrough","vaccine","penicillin","dna","genome","laser","x-ray","radioactivity","nuclear","insulin","electricity","evolution","relativity","quantum","photosynthesis","transfusion","transplant","cloning","crispr","electromagnetic induction","demonstrated"]
];

const avoid = ["murder","killed","killing","shooting","massacre","terrorist","terrorism","bombing","war","battle","genocide","assassinated","earthquake","tsunami","hurricane","cyclone","flood","disaster","crash","explosion","execution","attack","invasion"];

const clean = s => s.replace(/_/g," ").replace(/\s+/g," ").replace(/\[[^\]]+\]/g,"").trim();
const bad = s => avoid.some(x => s.toLowerCase().includes(x));

function score(text, words) {
  const t = text.toLowerCase();
  return words.reduce((n,w) => n + (t.includes(w) ? 8 : 0), 0);
}

async function main() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone:"Asia/Kolkata", year:"numeric", month:"2-digit", day:"2-digit"
  }).formatToParts(now);
  const get = t => parts.find(x => x.type === t).value;
  const month = get("month"), day = get("day");

  const res = await fetch(`${API}/${month}/${day}`, {
    headers: {"User-Agent":"Rushu-Tushu-GitHub-Profile-OnThisDay/1.0"}
  });
  if (!res.ok) throw new Error(`API request failed: ${res.status}`);

  const data = await res.json();
  const candidates = (data.events || [])
    .filter(e => e.text && e.year && e.pages?.length)
    .map(e => {
      const p = e.pages[0];
      return {
        year:e.year,
        title:clean(p.title),
        text:clean(e.text),
        url:p.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title)}`
      };
    })
    .filter(e => !bad(`${e.title} ${e.text}`));

  const used = new Set();
  const selected = [];

  for (const group of groups) {
    const ranked = candidates
      .filter(e => !used.has(e.url))
      .map(e => ({e, s:score(`${e.title} ${e.text}`,group)}))
      .filter(x => x.s > 0)
      .sort((a,b) => b.s-a.s);

    if (ranked[0]) {
      selected.push(ranked[0].e);
      used.add(ranked[0].e.url);
    }
  }

  for (const e of candidates) {
    if (selected.length >= 3) break;
    if (!used.has(e.url)) { selected.push(e); used.add(e.url); }
  }

  if (selected.length !== 3) throw new Error("Could not select three events.");

  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    day:"2-digit", month:"long", timeZone:"Asia/Kolkata"
  }).format(now).toUpperCase();

  const esc = s => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  const blocks = selected.map((e,i) => `
<p align="center">
  <sub>${String(i+1).padStart(2,"0")} · ${esc(String(e.year))}</sub>
  <br><br>
  <strong>${esc(e.title)}</strong>
  <br><br>
  ${esc(e.text)}
  <br><br>
  <a href="${e.url}"><sub>Read more ↗</sub></a>
</p>`).join("\n<br>\n<hr>\n<br>\n");

  const section = `${START}

<h2 align="center">⌁ ON THIS DAY</h2>

<p align="center">
  <i>Three moments worth remembering.</i>
  <br>
  <sub>${dateLabel}</sub>
</p>

<br>

${blocks}

<br>

<p align="center">
  <sub>Updated daily · 12:00 AM IST</sub>
</p>

${END}`;

  const readme = fs.readFileSync(README,"utf8");
  const a = readme.indexOf(START), b = readme.indexOf(END);
  if (a < 0 || b < 0 || b < a) throw new Error("README markers not found.");

  fs.writeFileSync(README, readme.slice(0,a) + section + readme.slice(b + END.length));
}

main().catch(e => { console.error(e); process.exit(1); });
