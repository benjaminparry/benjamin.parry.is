import { migrate } from "./migrate-images.mjs";
let pass = 0, fail = 0;
const check = (name, ok) => { ok ? pass++ : (fail++, console.log("FAIL", name)); };
const post = (front, body = "Text.\n") => `---\ntitle: T\n${front}---\n${body}`;

let r = migrate(post('images:\n  - "/a/one.jpg"\n  - "/a/two.jpg"\n'));
check("first image is the feed", r.text.includes('pictures:\n  feed:\n    src: "/a/one.jpg"'));
check("the second is a supporting image", r.text.includes("    - id: two\n      src: \"/a/two.jpg\"\n      # alt: describe this image"));
check("old key is gone", !/^images:/m.test(r.text));
check("title and body untouched", r.text.startsWith("---\ntitle: T\n") && r.text.endsWith("---\nText.\n"));
check("running it again skips", migrate(r.text).skip === "already has pictures:");

r = migrate(post("images:\n"));
check("empty images: is removed", r.text === post("") && r.count === 0);
check("nested images: is left alone", migrate(post("images:\n  primary:\n    source: x\n")).skip.includes("nested"));
check("media: string is not confused", migrate(post("media: film\nimages:\n  - /x.jpg\n")).text.includes("media: film"));
check("text printing {{ images }} is skipped", migrate(post("images:\n  - /x.jpg\n", '<img src="{{ images }}">\n')).skip.includes("{{ images }}"));
check("single quotes and CRLF", migrate(post("images:\n    - '/x.jpg'\n").replace(/\n/g, "\r\n")).text.includes('src: "/x.jpg"\r\n'));
check("flow style list", migrate(post("images: [/a.jpg, /b.jpg]\n")).count === 2);

const body = "Intro\n![Alt one](/p/one.jpg)\n![](/p/two.jpg \"A caption\")\nMore\n\n```\n![code](/p/no.jpg)\n```\ninline ![x](/p/y.jpg) here\n";
r = migrate(post("images:\n  - /p/one.jpg\n", body), { body: true });
check("pictures become figures with blank lines around", r.text.includes('Intro\n\n{% figure "one" %}\n\n{% figure "two" %}\n\nMore'));
check("alt moves across", r.text.includes('      alt: "Alt one"'));
check("title becomes the caption", r.text.includes('      caption: "A caption"'));
check("missing alt is a reminder", /id: two\n\s+src: "\/p\/two.jpg"\n\s+# alt:/.test(r.text));
check("code blocks are left alone", r.text.includes("![code](/p/no.jpg)"));
check("inline pictures are listed, not changed", r.text.includes("inline ![x](/p/y.jpg) here") && r.left.some((l) => l.includes("inline")));
check("an image in images: and the text is one entry", (r.text.match(/id: one/g) ?? []).length === 1);
check("without --body the text is untouched", migrate(post("images:\n  - /p/one.jpg\n", body)).text.includes("![Alt one](/p/one.jpg)"));
r = migrate(post("", "![A](/p/a.jpg)\n"), { body: true });
check("a post with only text pictures gets a pictures block and no feed", r.text.includes("pictures:\n  images:") && !r.text.includes("feed:"));
check("a post with no pictures is skipped", migrate(post("")).skip === "no images");
console.log(`${pass} of ${pass + fail} passed`);
process.exit(fail ? 1 : 0);
