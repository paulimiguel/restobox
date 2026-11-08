// Horarios escritos en la biografía de Instagram ("Lunes a Jueves de 9 a 20hs") → "Lunes a Jueves: 9:00 – 20:00".
export function hoursFromBio(bio: string) {
	const dayWord = /\b(?:lun(?:es)?|mar(?:tes)?|mi[eé](?:rcoles)?|jue(?:ves)?|vie(?:rnes)?|s[aá]b(?:ado)?s?|dom(?:ingo)?s?)\b\.?/i;
	const timeRange = /(\d{1,2})(?::(\d{2}))?\s*(?:hs?\b\.?)?\s*(?:a|al|-|–|—)\s*(\d{1,2})(?::(\d{2}))?\s*(?:hs?\b\.?|horas?\b)?/gi;
	const time = (hour: string, minutes?: string) => `${Number(hour)}:${minutes ?? '00'}`;
	return bio.split(/\n|•|\|/)
		.map((line) => line.trim())
		.flatMap((line) => {
			if (!dayWord.test(line)) return [];
			const ranges = [...line.matchAll(timeRange)].filter((match) => Number(match[1]) <= 24 && Number(match[3]) <= 24);
			const closed = /cerrado/i.test(line);
			if (!ranges.length && !closed) return [];
			const dayText = line.slice(0, ranges.length ? ranges[0].index : line.search(/cerrado/i))
				.replace(/\b(?:de|desde|el|los|las|todos)\s*$/i, '').replace(/[\s:,\-–—]+$/, '').replace(/\b(s[aá]bado|domingo)s\b/gi, '$1').trim();
			if (!dayWord.test(dayText)) return [];
			const hours = ranges.length ? ranges.map((match) => `${time(match[1], match[2])} – ${time(match[3], match[4])}`).join(', ') : 'Cerrado';
			return [`${dayText}: ${hours}`];
		})
		// La bio a veces llega repetida (descripción y vista previa): cada línea va una sola vez.
		.filter((line, index, lines) => lines.indexOf(line) === index)
		.join('\n');
}
