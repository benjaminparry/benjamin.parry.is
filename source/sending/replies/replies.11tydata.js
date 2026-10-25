// Data for every post in source/sending/replies/. See _config/sending.js for what a reply's front matter holds
// and how its address (/sending/replies/yyyy/mm/reply_yyyymmddhhmmss/) and default title are worked out.
import { sections, sectionData } from "../../../_config/sending.js";

export default sectionData(sections.find((s) => s.slug === "replies"));
