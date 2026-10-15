import type { Locale } from './types';

export const serviceSlugs = ['airport-transfer', 'business-escort', 'travel-escort', 'site-guarding', 'event-security', 'armed-transport', 'long-term-guarding', 'risk-assessment', 'security-training'] as const;
export type ServiceSlug = typeof serviceSlugs[number];
export const isServiceSlug = (value: string): value is ServiceSlug => serviceSlugs.some(slug => slug === value);
export const requiresAssessment = (slug: string) => ['site-guarding', 'event-security', 'armed-transport', 'long-term-guarding', 'risk-assessment', 'security-training'].includes(slug);
export const isLocale = (value: string): value is Locale => ['en', 'zh', 'th', 'sw'].includes(value);

const en = {
  country: 'Service country', apply: 'Apply country', catalog: 'Service catalog', heading: 'Security that moves with you.',
  intro: 'Plan your coverage with a clear scope and a transparent estimate. Our team confirms every service before dispatch.',
  demo: 'Demo estimate', demoNote: 'Illustrative services and unverified rates for this demo only. Availability, tax and deposit are examples; nothing here is bookable or payable.',
  unavailable: 'Published services are currently unavailable. A local team must confirm coverage and pricing.',
  scope: 'Service scope', use: 'Typical use', included: 'Included', excluded: 'Excluded', notice: 'Minimum notice', region: 'Regional conditions',
  includes: 'Service planning, assigned personnel and a local coordination contact.',
  excludes: 'Flights, accommodation, admission fees, insurance and unapproved route changes.',
  noticeText: 'At least 48 hours in this demo; actual lead time requires confirmation.',
  tz: 'Tanzania: city, route, permits and local partner availability require confirmation.',
  th: 'Thailand: city, route, permits and local partner availability require confirmation.',
  assessment: 'Quote after assessment', review: 'Review required', standard: 'Configurable estimate', details: 'View service', back: 'All services',
  configure: 'Configure your coverage', people: 'People', days: 'Days', hours: 'Hours per day', vehicles: 'Vehicles', armed: 'Armed protection',
  hoursNote: 'The estimate includes an 8-hour minimum per person per day. Additional hours use overtime rates.',
  personnel: 'Personnel', overtime: 'Overtime', vehicle: 'Vehicle', tax: 'Tax', subtotal: 'Subtotal', total: 'Estimated total', deposit: 'Estimated deposit',
  invalid: 'Enter whole numbers within the limits shown for each field.',
  missing: 'Published regional rates are unavailable. A team must assess your requirements.',
  missingRate: 'A required price is unavailable; a team must confirm the complete estimate.',
  custom: 'This service needs a tailored scope and a human-reviewed quote.',
  armedReason: 'Armed services are applications only, subject to legal and operational review. No automatic deposit is available.',
  next: 'Review estimate', application: 'Review application requirements', nextNote: 'This is a preview. Booking and application submission are not yet available.',
  version: 'Price version', effective: 'Effective from', applicationNote: 'A team must confirm the location, dates, scope and any required permits before approval.',
};
type Copy = typeof en;
export const copy: Record<Locale, Copy> = {
  en,
  zh: {
    country:'服务国家', apply:'切换国家', catalog:'服务目录', heading:'安心随行，保障每一程。', intro:'明确服务范围，查看透明估算。所有服务均须由团队确认后安排。',
    demo:'演示估算', demoNote:'仅为演示的示例服务与未经核实的费率。可用性、税费及定金均为示例，不可预订或付款。', unavailable:'暂无已发布的服务数据。服务范围和价格须由当地团队确认。',
    scope:'服务范围', use:'适用场景', included:'包含内容', excluded:'不包含', notice:'最短提前时间', region:'地区条件', includes:'服务规划、指定人员及当地协调联系人。', excludes:'机票、住宿、门票、保险及未经批准的路线变更。', noticeText:'本演示至少提前48小时；实际时间须确认。', tz:'坦桑尼亚：城市、路线、许可及当地合作伙伴的可用性须确认。', th:'泰国：城市、路线、许可及当地合作伙伴的可用性须确认。',
    assessment:'评估后报价', review:'需审核确认', standard:'可配置估算', details:'查看服务', back:'所有服务', configure:'配置服务需求', people:'人数', days:'天数', hours:'每日小时数', vehicles:'车辆数', armed:'武装保护', hoursNote:'估算按每人每天至少8小时计费，额外时间按加班费率计算。', personnel:'人员', overtime:'加班', vehicle:'车辆', tax:'税费', subtotal:'小计', total:'预估总额', deposit:'预估定金', invalid:'请在每个字段标明的范围内输入整数。', missing:'暂无已发布的地区费率，须由团队评估需求。', missingRate:'所需价格不完整，须由团队确认完整报价。', custom:'本服务须定制服务范围并经人工审核报价。', armedReason:'武装服务仅接受申请，须进行法律及运营审核，无法自动支付定金。', next:'查看估算说明', application:'查看申请要求', nextNote:'当前仅为预览，尚未开放预订及申请提交。', version:'价格版本', effective:'生效时间', applicationNote:'批准前，团队须确认地点、日期、服务范围及所需许可。',
  },
  th: {
    country:'ประเทศที่ให้บริการ', apply:'เลือกประเทศ', catalog:'รายการบริการ', heading:'ความปลอดภัยในทุกการเดินทาง', intro:'วางแผนความคุ้มครองด้วยขอบเขตและประมาณการที่ชัดเจน ทีมงานจะยืนยันก่อนให้บริการทุกครั้ง',
    demo:'ประมาณการสาธิต', demoNote:'บริการและราคาตัวอย่างสำหรับการสาธิตเท่านั้น ภาษีและมัดจำยังไม่ผ่านการยืนยัน ไม่สามารถจองหรือชำระเงินได้', unavailable:'ยังไม่มีข้อมูลบริการที่เผยแพร่ ทีมงานในพื้นที่ต้องยืนยันขอบเขตและราคา',
    scope:'ขอบเขตบริการ', use:'การใช้งานทั่วไป', included:'รวมในบริการ', excluded:'ไม่รวม', notice:'แจ้งล่วงหน้าขั้นต่ำ', region:'เงื่อนไขในพื้นที่', includes:'การวางแผน บุคลากรที่ได้รับมอบหมาย และผู้ประสานงานในพื้นที่', excludes:'เที่ยวบิน ที่พัก ค่าเข้าชม ประกัน และการเปลี่ยนเส้นทางที่ไม่ได้รับอนุมัติ', noticeText:'ตัวอย่างนี้ต้องแจ้งล่วงหน้า 48 ชั่วโมง ระยะเวลาจริงต้องยืนยัน', tz:'แทนซาเนีย: ต้องยืนยันเมือง เส้นทาง ใบอนุญาต และความพร้อมของพันธมิตร', th:'ไทย: ต้องยืนยันเมือง เส้นทาง ใบอนุญาต และความพร้อมของพันธมิตร',
    assessment:'เสนอราคาหลังประเมิน', review:'ต้องได้รับการตรวจสอบ', standard:'ปรับประมาณการได้', details:'ดูบริการ', back:'บริการทั้งหมด', configure:'กำหนดความคุ้มครอง', people:'จำนวนคน', days:'จำนวนวัน', hours:'ชั่วโมงต่อวัน', vehicles:'จำนวนรถ', armed:'การคุ้มครองพร้อมอาวุธ', hoursNote:'ประมาณการคิดขั้นต่ำ 8 ชั่วโมงต่อคนต่อวัน ชั่วโมงเพิ่มเติมคิดอัตราล่วงเวลา', personnel:'บุคลากร', overtime:'ล่วงเวลา', vehicle:'รถ', tax:'ภาษี', subtotal:'ยอดก่อนภาษี', total:'ยอดรวมโดยประมาณ', deposit:'มัดจำโดยประมาณ', invalid:'กรอกจำนวนเต็มภายในขอบเขตที่ระบุในแต่ละช่อง', missing:'ยังไม่มีอัตราในพื้นที่ที่เผยแพร่ ทีมงานต้องประเมินความต้องการ', missingRate:'ข้อมูลราคาที่จำเป็นไม่ครบ ทีมงานต้องยืนยันราคา', custom:'บริการนี้ต้องกำหนดขอบเขตและให้เจ้าหน้าที่ประเมินราคา', armedReason:'บริการพร้อมอาวุธต้องยื่นคำขอและผ่านการตรวจสอบกฎหมายและการปฏิบัติงาน ไม่มีมัดจำอัตโนมัติ', next:'ตรวจสอบประมาณการ', application:'ดูข้อกำหนดการสมัคร', nextNote:'นี่เป็นตัวอย่าง ยังไม่เปิดรับจองหรือยื่นคำขอ', version:'รุ่นราคา', effective:'มีผลตั้งแต่', applicationNote:'ทีมงานต้องยืนยันสถานที่ วันที่ ขอบเขตและใบอนุญาตก่อนอนุมัติ',
  },
  sw: {
    country:'Nchi ya huduma', apply:'Chagua nchi', catalog:'Orodha ya huduma', heading:'Usalama katika kila safari.', intro:'Panga ulinzi kwa maelezo na makadirio yaliyo wazi. Timu yetu inathibitisha kila huduma kabla ya kuanza.',
    demo:'Makadirio ya majaribio', demoNote:'Huduma na bei za mfano tu. Upatikanaji, kodi na amana hazijathibitishwa; hakuna uwekaji nafasi au malipo.', unavailable:'Huduma zilizochapishwa hazipatikani kwa sasa. Timu ya eneo lazima ithibitishe huduma na bei.',
    scope:'Wigo wa huduma', use:'Matumizi ya kawaida', included:'Kinachojumuishwa', excluded:'Visivyojumuishwa', notice:'Muda wa taarifa', region:'Masharti ya eneo', includes:'Upangaji wa huduma, wafanyakazi waliopangiwa na mratibu wa eneo.', excludes:'Ndege, malazi, viingilio, bima na mabadiliko ya njia yasiyoidhinishwa.', noticeText:'Angalau saa 48 kwa mfano huu; muda halisi lazima uthibitishwe.', tz:'Tanzania: jiji, njia, vibali na upatikanaji wa washirika lazima vithibitishwe.', th:'Thailand: jiji, njia, vibali na upatikanaji wa washirika lazima vithibitishwe.',
    assessment:'Bei baada ya tathmini', review:'Uidhinishaji unahitajika', standard:'Makadirio yanayorekebishwa', details:'Angalia huduma', back:'Huduma zote', configure:'Panga ulinzi wako', people:'Watu', days:'Siku', hours:'Saa kwa siku', vehicles:'Magari', armed:'Ulinzi wenye silaha', hoursNote:'Makadirio yanajumuisha angalau saa 8 kwa mtu kwa siku. Saa zaidi zinatumia bei ya ziada.', personnel:'Wafanyakazi', overtime:'Saa za ziada', vehicle:'Gari', tax:'Kodi', subtotal:'Jumla kabla ya kodi', total:'Jumla ya makadirio', deposit:'Amana ya makadirio', invalid:'Weka namba kamili ndani ya mipaka iliyoonyeshwa.', missing:'Bei za eneo zilizochapishwa hazipatikani. Timu lazima itathmini mahitaji yako.', missingRate:'Bei inayohitajika haipatikani; timu lazima ithibitishe makadirio kamili.', custom:'Huduma hii inahitaji wigo maalumu na bei iliyopitiwa na mhudumu.', armedReason:'Huduma zenye silaha ni maombi tu, zinahitaji ukaguzi wa sheria na utendaji. Hakuna amana ya moja kwa moja.', next:'Pitia makadirio', application:'Pitia masharti ya maombi', nextNote:'Haya ni majaribio. Uwekaji nafasi na kutuma maombi bado havijapatikana.', version:'Toleo la bei', effective:'Kuanzia', applicationNote:'Timu lazima ithibitishe eneo, tarehe, wigo na vibali kabla ya kuidhinisha.',
  },
};

// Editorial descriptions do not assert that a service is published or available.
const serviceText: Record<Locale, readonly (readonly [string, string, string])[]> = {
  en: [
    ['Airport transfer','Coordinated airport pickup and protected onward travel.','Airport arrivals and departures.'],
    ['Business escort','Accompaniment between meetings and business destinations.','Business visits and executive itineraries.'],
    ['Travel escort','Route-based personal accompaniment during a trip.','Day trips and multi-stop travel.'],
    ['Site guarding','Fixed-site guarding staffed by role and shift for recurring monthly coverage; the final scope is assessed before quoting.','Offices, properties and temporary sites.'],
    ['Event security','A tailored plan for access, crowd flow and incident coordination.','Conferences and private events.'],
    ['Armed transport','An application for reviewed transport protection where legally permitted.','Sensitive transport requiring individual review.'],
    ['Long-term guarding','An assessed staffing and supervision plan for recurring coverage.','Ongoing property and facility protection.'],
    ['Risk assessment','A structured review of location, route and operational exposure.','Preparing a journey, site or event.'],
    ['Security training','A tailored learning plan for practical security awareness.','Teams preparing for travel or site operations.'],
  ],
  zh: [
    ['机场接送','协调机场接送及后续行程保护。','机场抵达与出发。'], ['商务随行','陪同往返会议及商务目的地。','商务访问与管理人员行程。'], ['旅行随行','在旅途中提供按路线安排的陪同。','一日游及多站旅行。'], ['场地守卫','在约定出入口及巡逻区域配备人员。','办公室、物业及临时场地。'], ['活动安保','定制入口管理、人流及事件协调方案。','会议及私人活动。'], ['武装运输','在法律允许情况下申请经审核的运输保护。','需要单独审核的敏感运输。'], ['长期守卫','评估长期人员配置及监督方案。','持续的物业与设施保护。'], ['风险评估','系统评估地点、路线及运营风险。','旅程、场地或活动筹备。'], ['安全培训','定制实用安全意识学习方案。','准备旅行或场地运营的团队。'],
  ],
  th: [
    ['รับส่งสนามบิน','ประสานงานรับส่งและคุ้มครองการเดินทางต่อ','การเดินทางเข้าและออกสนามบิน'], ['คุ้มครองธุรกิจ','ดูแลระหว่างการประชุมและจุดหมายทางธุรกิจ','การเยี่ยมธุรกิจและกำหนดการผู้บริหาร'], ['คุ้มครองการเดินทาง','ดูแลส่วนบุคคลตามเส้นทางระหว่างการเดินทาง','ทริปหนึ่งวันและการเดินทางหลายจุด'], ['รักษาความปลอดภัยสถานที่','จัดบุคลากรตามจุดเข้าออกและพื้นที่ตรวจตราที่ตกลง','สำนักงาน อาคารและสถานที่ชั่วคราว'], ['รักษาความปลอดภัยงาน','วางแผนทางเข้า การไหลของผู้คนและประสานเหตุการณ์','การประชุมและงานส่วนตัว'], ['ขนส่งพร้อมอาวุธ','คำขอคุ้มครองการขนส่งที่ผ่านการตรวจสอบตามกฎหมาย','การขนส่งที่ต้องตรวจสอบเฉพาะราย'], ['ดูแลระยะยาว','ประเมินแผนบุคลากรและการควบคุมดูแลต่อเนื่อง','การคุ้มครองอาคารและสถานที่ต่อเนื่อง'], ['ประเมินความเสี่ยง','ตรวจสอบความเสี่ยงสถานที่ เส้นทางและการปฏิบัติงาน','การเตรียมเดินทาง สถานที่หรืองาน'], ['ฝึกอบรมความปลอดภัย','แผนการเรียนรู้ด้านความปลอดภัยที่ปรับตามความต้องการ','ทีมที่เตรียมเดินทางหรือปฏิบัติงาน'],
  ],
  sw: [
    ['Usafiri wa uwanja wa ndege','Kuratibu mapokezi na ulinzi wa safari ya kuendelea.','Kuwasili na kuondoka uwanja wa ndege.'], ['Ulinzi wa biashara','Kuandamana kati ya mikutano na maeneo ya biashara.','Ziara za biashara na safari za viongozi.'], ['Ulinzi wa safari','Kuandamana na mtu kulingana na njia ya safari.','Safari za siku na vituo vingi.'], ['Ulinzi wa eneo','Wafanyakazi katika viingilio na maeneo ya doria yaliyokubaliwa.','Ofisi, majengo na maeneo ya muda.'], ['Ulinzi wa hafla','Mpango wa viingilio, mtiririko wa watu na uratibu wa matukio.','Mikutano na hafla binafsi.'], ['Usafirishaji wenye silaha','Maombi ya ulinzi wa usafirishaji unaoruhusiwa kisheria.','Usafirishaji nyeti unaohitaji ukaguzi binafsi.'], ['Ulinzi wa muda mrefu','Tathmini ya mpango wa wafanyakazi na usimamizi endelevu.','Ulinzi wa kudumu wa majengo na vifaa.'], ['Tathmini ya hatari','Ukaguzi wa hatari za eneo, njia na utendaji.','Maandalizi ya safari, eneo au hafla.'], ['Mafunzo ya usalama','Mpango maalumu wa kujifunza ufahamu wa usalama.','Timu zinazojiandaa kwa safari au kazi za eneo.'],
  ],
};

export function serviceContent(slug: ServiceSlug, locale: Locale) {
  const [name, scope, use] = serviceText[locale][serviceSlugs.indexOf(slug)];
  return {name, scope, use};
}
