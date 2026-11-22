// What goes into a cycle's list of links, and where to find it. Edit this file to add or change a type of content.
//
// folder      the folder inside source/ (so "watching" means source/watching/)
// skip        folders inside it to leave out
// activityKey for things you watch, play or listen to: the front matter list of dated entries (watched:, listened: ...)
//             A post is included if one of those dates is in the cycle. Without it, the post's own date is used.
// note        optional: a short bit of text to show after the link (return nothing to show nothing)
export default {
  inputDir: "source",
  cyclesFolder: "collecting/cycles", // where cycle posts live, used to find the previous cycle

  sections: [
    { key: "writing",   title: "Writing",   folder: "writing" },
    { key: "collecting", title: "Collecting", folder: "collecting", skip: ["cycles"] },
    { key: "watching",  title: "Watching",  folder: "watching",  activityKey: "watched",  note: (d) => d.rating_emoji },
    { key: "playing",   title: "Playing",   folder: "playing",   activityKey: "played" },
    { key: "listening", title: "Listening", folder: "listening", activityKey: "listened", note: (d) => d.artist },
    // To add another type later, copy a line, for example:
    // { key: "reading", title: "Reading", folder: "reading", activityKey: "read" },
  ],
};
