// Builds a small made-up site in a temporary folder, for the tag tests. Four topics, six posts each.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TOPICS = {
  accessibility: {
    tags: ["Accessibility"],
    texts: [
      "Screen reader users navigate by headings, so a clear heading structure matters for accessibility.",
      "Colour contrast and keyboard focus are the first things to check in an accessibility audit of a website.",
      "WCAG guidelines describe how to make content accessible to people using assistive technology like a screen reader.",
      "Alt text for images, captions for video and a visible keyboard focus all help accessibility.",
      "Testing with a screen reader showed how confusing unlabelled buttons are for assistive technology users.",
      "Accessible forms need labels, error messages and keyboard support so everyone can finish them.",
    ],
  },
  research: {
    tags: ["Research", "Interview"],
    texts: [
      "In a user interview, ask open questions and let the participant talk about their own experience.",
      "Qualitative research interviews reveal why people behave as they do, not just what they do.",
      "Prepare an interview guide, recruit participants and take notes while the research session runs.",
      "Synthesising interview notes into themes is the part of user research that takes longest.",
      "Good research interviews avoid leading questions and listen for stories from the participant.",
      "After each interview session the research team met to share what the participants had said.",
    ],
  },
  indieweb: {
    tags: ["Indieweb"],
    texts: [
      "Webmentions let one website notify another, a core building block of the indieweb.",
      "POSSE means publishing on your own site and syndicating copies elsewhere, an indieweb habit.",
      "My homepage is my own site, owning my content rather than renting space on a social network.",
      "Setting up webmentions on a static site needs an endpoint and a way to display the replies.",
      "The indieweb community meets at Homebrew Website Club to share what they built on their sites.",
      "Syndicating posts to Mastodon from my own site follows the POSSE idea of the indieweb.",
    ],
  },
  japan: {
    tags: ["Japan", "Travel"],
    texts: [
      "A week in Tokyo, riding the trains, eating ramen and visiting shrines while travelling in Japan.",
      "Kyoto temples and gardens at dawn, before the tourists arrived, on our trip around Japan.",
      "Travelling through Japan by rail pass, from Osaka castle to the hot springs of Hakone.",
      "We watched sumo in Tokyo and learned the rituals of Japan's national sport while travelling.",
      "Learning Japanese before the trip made travel in Japan far easier, from menus to train stations.",
      "Convenience stores in Japan sell excellent food, a highlight of any travel itinerary.",
    ],
  },
};

export function makeSite(extra = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tags-site-"));
  const write = (rel, text) => { const file = path.join(root, rel); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
  let n = 0;
  for (const [topic, { tags, texts }] of Object.entries(TOPICS)) {
    texts.forEach((text, i) => {
      n++;
      const section = i % 2 ? "writing" : "collecting/thoughts";
      const list = tags.map((t) => `  - ${t}`).join("\n");
      write(`source/${section}/2024-01-${String(n).padStart(2, "0")}-${topic}-${i}.md`,
        `---\ntitle: "A note on ${topic} ${i + 1}"\nsummary: "${text.split(",")[0]}"\ntags:\n${list}\n---\n\n${text}\n\nSome more words about ${topic} to make the post a little longer, because short posts give little to compare.\n`);
    });
  }
  write("source/writing/2024-02-01-untagged-a11y.md", `---\ntitle: "Checking a website for accessibility"\nsummary: "A screen reader and the keyboard"\n---\n\nI tried a screen reader on the site, and the keyboard focus was lost in the menu. WCAG says focus must be visible.\n`);
  write("source/pages/about.md", `---\ntitle: About\ntags:\n  - Pages\n---\nNot a post.\n`);
  write("_config/tags.config.json", JSON.stringify({ ignore: ["pages"], aliases: { research: ["user research"] }, ...extra }));
  return { root, cleanup: () => fs.rmSync(root, { recursive: true, force: true }), write };
}
