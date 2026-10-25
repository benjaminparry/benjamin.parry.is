// Data for every post in source/sending/likes/. See _config/sending.js for what a like's front matter holds
// and how its address (/sending/likes/yyyy/mm/like_yyyymmddhhmmss/) and default title are worked out.
import { sections, sectionData } from "../../../_config/sending.js";

export default sectionData(sections.find((s) => s.slug === "likes"));
