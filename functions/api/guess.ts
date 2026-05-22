// POST /api/guess — server-authoritative grading.
// Client never receives the answer until guess #6 has been used without winning.

const WORDS = [
  "APPLE","BEACH","BRAIN","BREAD","CHAIR","CHEER","CLOUD","CRANE","DAILY","DANCE",
  "DREAM","DRINK","EAGLE","EARTH","ELDER","FAITH","FLAME","FRESH","GHOST","GRACE",
  "GRAPE","GREEN","HAPPY","HEART","HORSE","HOTEL","HOUSE","HUMAN","IMAGE","IVORY",
  "JOLLY","JUICE","KNIFE","LEMON","LIGHT","LOYAL","LUNCH","MAGIC","MARCH","MONEY",
  "MUSIC","NIGHT","NOBLE","NORTH","NOVEL","OCEAN","OLIVE","ORBIT","PEACE","PEARL",
  "PIANO","PRIDE","QUIET","QUICK","QUOTE","RADIO","RIVER","ROYAL","SHINE","SHORE",
  "SMART","SMILE","SOLAR","SOUTH","STONE","STORM","SWIFT","TIDAL","TIGER","TRAIN",
  "TRUTH","UNITY","URBAN","VAULT","VIVID","VOICE","WATER","WHEEL","WORLD","YOUTH",
];

type Status = "correct" | "present" | "absent";

function dailyAnswer(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d);
  const epoch = Date.UTC(2026, 0, 1);
  const day = Math.floor((t - epoch) / 86400000);
  const idx = ((day % WORDS.length) + WORDS.length) % WORDS.length;
  return WORDS[idx];
}

function grade(guess: string, answer: string): Status[] {
  const out: Status[] = ["absent", "absent", "absent", "absent", "absent"];
  const used = [false, false, false, false, false];
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) {
      out[i] = "correct";
      used[i] = true;
    }
  }
  for (let i = 0; i < 5; i++) {
    if (out[i] === "correct") continue;
    for (let j = 0; j < 5; j++) {
      if (!used[j] && guess[i] === answer[j]) {
        out[i] = "present";
        used[j] = true;
        break;
      }
    }
  }
  return out;
}

export const onRequestPost = async ({ request }: { request: Request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const guess = String(b.guess ?? "").toUpperCase();
  const date = String(b.date ?? "");
  const guessNumber = Number(b.guessNumber ?? 0);

  if (!/^[A-Z]{5}$/.test(guess)) return new Response("bad guess", { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return new Response("bad date", { status: 400 });

  const answer = dailyAnswer(date);
  const statuses = grade(guess, answer);
  const win = statuses.every((s) => s === "correct");
  const reveal = !win && guessNumber >= 6;

  return new Response(
    JSON.stringify({ statuses, win, ...(reveal ? { answer } : {}) }),
    { headers: { "content-type": "application/json" } },
  );
};
