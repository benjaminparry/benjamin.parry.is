// Helpers for showing when the site was built.
// Plain JavaScript with no Eleventy code in it, so it is easy to test on its own.

// 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th", 11 -> "11th", 21 -> "21st"
export function ordinal(n) {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th"}`;
}

// "Thu 5th November 2026 at 14:55", in UK time (so it follows British Summer Time)
export function builtDateTime(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      weekday: "short", day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/London",
    }).formatToParts(date instanceof Date ? date : new Date(date)).map((p) => [p.type, p.value]),
  );
  return `${parts.weekday} ${ordinal(Number(parts.day))} ${parts.month} ${parts.year} at ${parts.hour}:${parts.minute}`;
}
