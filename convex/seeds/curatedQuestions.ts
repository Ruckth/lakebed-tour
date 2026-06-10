import type { SuggestedQuestionTranslations } from '../lib/chatSuggestions';

export type SeedDynamicIntent =
	| 'availability'
	| 'pricing'
	| 'property_details'
	| 'booking_help'
	| 'contact';

export type SeedSuggestionTopic =
	| 'villa_fit'
	| 'direct_booking'
	| 'tour'
	| 'availability'
	| 'booking'
	| 'amenities'
	| 'contact';

export type CuratedQuestionSeed = {
	question: string;
	translations: Required<SuggestedQuestionTranslations>;
	topic: SeedSuggestionTopic;
	dynamicIntent: SeedDynamicIntent;
	score: number;
};

export const curatedQuestionSeeds: CuratedQuestionSeed[] = [
	{
		question: 'Can I check availability for my dates?',
		translations: {
			en: 'Can I check availability for my dates?',
			th: 'ตรวจสอบห้องว่างสำหรับวันที่ของฉันได้ไหม?',
			'zh-CN': '我可以查看这些日期是否有空房吗？',
			ja: '希望の日程で空室を確認できますか？',
			ko: '제 날짜에 예약 가능한지 확인할 수 있나요?',
			fr: 'Puis-je vérifier les disponibilités pour mes dates ?',
			de: 'Kann ich die Verfügbarkeit für meine Reisedaten prüfen?',
			es: '¿Puedo comprobar la disponibilidad para mis fechas?',
			ru: 'Можно проверить доступность на мои даты?',
			it: 'Posso controllare la disponibilità per le mie date?',
			hi: 'क्या मैं अपनी तारीखों के लिए उपलब्धता देख सकता हूँ?'
		},
		topic: 'availability',
		dynamicIntent: 'availability',
		score: 100
	},
	{
		question: 'What is the direct booking price?',
		translations: {
			en: 'What is the direct booking price?',
			th: 'ราคาจองตรงเท่าไหร่?',
			'zh-CN': '直接预订价格是多少？',
			ja: '直接予約の料金はいくらですか？',
			ko: '직접 예약 가격은 얼마인가요?',
			fr: 'Quel est le prix en réservation directe ?',
			de: 'Wie hoch ist der Preis bei Direktbuchung?',
			es: '¿Cuál es el precio reservando directamente?',
			ru: 'Какая цена при прямом бронировании?',
			it: 'Qual è il prezzo prenotando direttamente?',
			hi: 'सीधी बुकिंग की कीमत क्या है?'
		},
		topic: 'direct_booking',
		dynamicIntent: 'pricing',
		score: 98
	},
	{
		question: 'Which villa fits my group best?',
		translations: {
			en: 'Which villa fits my group best?',
			th: 'วิลล่าไหนเหมาะกับกลุ่มของฉันที่สุด?',
			'zh-CN': '哪栋别墅最适合我的团队？',
			ja: '私たちのグループに一番合うヴィラはどれですか？',
			ko: '우리 그룹에 가장 잘 맞는 빌라는 어디인가요?',
			fr: 'Quelle villa convient le mieux à mon groupe ?',
			de: 'Welche Villa passt am besten zu meiner Gruppe?',
			es: '¿Qué villa se adapta mejor a mi grupo?',
			ru: 'Какая вилла лучше всего подойдет моей группе?',
			it: 'Quale villa è più adatta al mio gruppo?',
			hi: 'मेरे समूह के लिए कौन सा विला सबसे अच्छा है?'
		},
		topic: 'villa_fit',
		dynamicIntent: 'property_details',
		score: 96
	},
	{
		question: 'Can I see the villa in 360?',
		translations: {
			en: 'Can I see the villa in 360?',
			th: 'ดูวิลล่าแบบ 360 ได้ไหม?',
			'zh-CN': '我可以看别墅的 360 度导览吗？',
			ja: 'ヴィラを360度で見られますか？',
			ko: '빌라를 360도로 볼 수 있나요?',
			fr: 'Puis-je voir la villa en 360 ?',
			de: 'Kann ich die Villa in 360 Grad ansehen?',
			es: '¿Puedo ver la villa en 360?',
			ru: 'Можно посмотреть виллу в формате 360?',
			it: 'Posso vedere la villa a 360 gradi?',
			hi: 'क्या मैं विला को 360 में देख सकता हूँ?'
		},
		topic: 'tour',
		dynamicIntent: 'property_details',
		score: 94
	},
	{
		question: 'What amenities are included?',
		translations: {
			en: 'What amenities are included?',
			th: 'มีสิ่งอำนวยความสะดวกอะไรบ้าง?',
			'zh-CN': '包含哪些设施？',
			ja: 'どのようなアメニティが含まれていますか？',
			ko: '어떤 편의시설이 포함되어 있나요?',
			fr: 'Quels équipements sont inclus ?',
			de: 'Welche Annehmlichkeiten sind enthalten?',
			es: '¿Qué servicios están incluidos?',
			ru: 'Какие удобства включены?',
			it: 'Quali servizi sono inclusi?',
			hi: 'कौन-कौन सी सुविधाएं शामिल हैं?'
		},
		topic: 'amenities',
		dynamicIntent: 'property_details',
		score: 92
	},
	{
		question: 'How many guests can stay comfortably?',
		translations: {
			en: 'How many guests can stay comfortably?',
			th: 'พักได้สบายกี่คน?',
			'zh-CN': '可以舒适入住多少位客人？',
			ja: '快適に宿泊できる人数は何名ですか？',
			ko: '몇 명까지 편안하게 머물 수 있나요?',
			fr: 'Combien de personnes peuvent séjourner confortablement ?',
			de: 'Wie viele Gäste können bequem übernachten?',
			es: '¿Cuántos huéspedes pueden alojarse cómodamente?',
			ru: 'Сколько гостей могут комфортно разместиться?',
			it: 'Quanti ospiti possono soggiornare comodamente?',
			hi: 'कितने मेहमान आराम से ठहर सकते हैं?'
		},
		topic: 'amenities',
		dynamicIntent: 'property_details',
		score: 90
	},
	{
		question: 'How do I book direct?',
		translations: {
			en: 'How do I book direct?',
			th: 'จองตรงได้อย่างไร?',
			'zh-CN': '我该如何直接预订？',
			ja: '直接予約はどうすればよいですか？',
			ko: '직접 예약은 어떻게 하나요?',
			fr: 'Comment réserver directement ?',
			de: 'Wie buche ich direkt?',
			es: '¿Cómo reservo directamente?',
			ru: 'Как забронировать напрямую?',
			it: 'Come posso prenotare direttamente?',
			hi: 'मैं सीधे बुकिंग कैसे करूँ?'
		},
		topic: 'booking',
		dynamicIntent: 'booking_help',
		score: 88
	},
	{
		question: 'Can I message the host on WhatsApp?',
		translations: {
			en: 'Can I message the host on WhatsApp?',
			th: 'ส่งข้อความหาเจ้าของที่พักทาง WhatsApp ได้ไหม?',
			'zh-CN': '我可以通过 WhatsApp 给房东发消息吗？',
			ja: 'WhatsAppでホストにメッセージできますか？',
			ko: 'WhatsApp으로 호스트에게 메시지를 보낼 수 있나요?',
			fr: "Puis-je envoyer un message à l'hôte sur WhatsApp ?",
			de: 'Kann ich dem Gastgeber über WhatsApp schreiben?',
			es: '¿Puedo enviar un mensaje al anfitrión por WhatsApp?',
			ru: 'Можно написать хозяину в WhatsApp?',
			it: "Posso scrivere all'host su WhatsApp?",
			hi: 'क्या मैं WhatsApp पर होस्ट को संदेश भेज सकता हूँ?'
		},
		topic: 'contact',
		dynamicIntent: 'contact',
		score: 86
	},
	{
		question: 'What is the cancellation policy?',
		translations: {
			en: 'What is the cancellation policy?',
			th: 'นโยบายการยกเลิกเป็นอย่างไร?',
			'zh-CN': '取消政策是什么？',
			ja: 'キャンセルポリシーはどうなっていますか？',
			ko: '취소 정책은 어떻게 되나요?',
			fr: "Quelle est la politique d'annulation ?",
			de: 'Wie lauten die Stornierungsbedingungen?',
			es: '¿Cuál es la política de cancelación?',
			ru: 'Каковы условия отмены?',
			it: 'Qual è la politica di cancellazione?',
			hi: 'रद्द करने की नीति क्या है?'
		},
		topic: 'booking',
		dynamicIntent: 'booking_help',
		score: 84
	},
	{
		question: 'Is airport pickup included?',
		translations: {
			en: 'Is airport pickup included?',
			th: 'มีรถรับจากสนามบินรวมอยู่ด้วยไหม?',
			'zh-CN': '包含机场接送吗？',
			ja: '空港送迎は含まれていますか？',
			ko: '공항 픽업이 포함되어 있나요?',
			fr: "Le transfert depuis l'aéroport est-il inclus ?",
			de: 'Ist die Abholung vom Flughafen inbegriffen?',
			es: '¿Está incluido el traslado desde el aeropuerto?',
			ru: 'Включен ли трансфер из аэропорта?',
			it: "Il transfer dall'aeroporto è incluso?",
			hi: 'क्या एयरपोर्ट पिकअप शामिल है?'
		},
		topic: 'direct_booking',
		dynamicIntent: 'property_details',
		score: 82
	}
];

export function getSeedTranslations(question: string) {
	return curatedQuestionSeeds.find((seed) => seed.question === question)?.translations;
}
