const str = "RankingsNIRF Rank 15 in engineering 2023 NAAC grade A+ with 3.45 cgpa";
const regex = /(?:grade\s*['"]?\b([A-C](?:\+\+?|))(?:$|[\s'".,;])|['"]?\b([A-C](?:\+\+?|))(?:$|[\s'".,;])\s*grade)/i;
console.log(str.match(regex));
