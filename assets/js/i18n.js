// © 2026 Integrated Retail Management Consulting Pte. Ltd. All rights reserved.
// Proprietary and confidential — unauthorised copying or redistribution of
// this script, in whole or in part, is prohibited.
//
// Lightweight client-side translation engine.
// English is read directly from the page's own markup the first time each
// element is seen (so the HTML source stays the single source of truth for
// English copy). Switching language rewrites [data-i18n] elements' innerHTML
// from the dictionary below; switching back to English restores the
// captured original markup, so nothing needs to be duplicated for "en".
(function () {
  var STORAGE_KEY = 'ir_lang';
  var DEFAULT_LANG = 'en';

  var DICT = {
    id: {
      'nav.home': 'Beranda',
      'nav.about': 'Tentang Kami',
      'nav.solution': 'Solusi Kami',
      'nav.product': 'Produk',
      'nav.more': 'Lainnya',
      'nav.others': 'Lain-lain',
      'nav.industries': 'Industri',
      'nav.indFashion': 'Fashion & Apparel',
      'nav.indHealth': 'Kesehatan & Kecantikan',
      'nav.indFnb': 'F&B',
      'nav.indMalls': 'Pusat Perbelanjaan',
      'nav.indLuxury': 'Ritel Mewah',
      'nav.indGroceries': 'Toko Kelontong',
      'nav.indDept': 'Departemen Store',
      'nav.services': 'Layanan',
      'nav.svcSolutionDesign': 'Desain Solusi',
      'nav.svcProjectDelivery': 'Pelaksanaan Proyek',
      'nav.svcManagedServices': 'Layanan Terkelola',
      'nav.svcTraining': 'Pelatihan',
      'nav.svcIntegration': 'Integrasi',
      'nav.clients': 'Klien',
      'nav.resources': 'Sumber Daya',
      'nav.contact': 'Kontak',
      'nav.knowledgeHub': 'Pusat Pengetahuan',
      'nav.helpdesk': 'Pusat Bantuan',
      'nav.bookConsultation': 'Jadwalkan Konsultasi',
      'nav.aboutCompany': 'Perusahaan',
      'nav.aboutValues': 'Nilai &amp; Budaya',
      'nav.aboutCareers': 'Karier',
      'nav.aboutPartners': 'Mitra',
      'nav.resCaseStudies': 'Studi Kasus',
      'nav.resBlog': 'Blog',
      'nav.resFaq': 'FAQ',

      'footer.tagline': 'Integrated Retail &mdash; sistem ritel canggih dan terpadu untuk bisnis fashion, lifestyle, F&amp;B, dan CPG di seluruh Asia Pasifik, dari mitra yang mengintegrasikan dan membangun: POS, CRM, e-commerce, inventaris, analitik, dan AI, sebagai satu kesatuan.',
      'footer.company': 'Perusahaan',
      'footer.more': 'Lainnya',
      'footer.resources': 'Sumber Daya',
      'footer.products': 'Produk',
      'footer.offices': 'Kantor',
      'footer.singapore': 'Singapura',
      'footer.indonesia': 'Indonesia',
      'footer.thailand': 'Thailand',
      'footer.contactUs': 'Hubungi Kami &rarr;',
      'footer.rights': '&copy; 2026 Integrated Retail Management Consulting Pte. Ltd. Hak cipta dilindungi undang-undang.',
      'footer.trademarks': 'Semua nama produk, logo, dan merek pihak ketiga yang disebutkan di situs ini adalah merek dagang milik pemiliknya masing-masing, digunakan di sini untuk mengidentifikasi produk yang diterapkan dan didukung oleh Integrated Retail. Penggunaannya tidak menyiratkan dukungan.',

      'common.bookFreeConsultation': 'Jadwalkan Konsultasi Gratis',
      'common.learnMore': 'Pelajari lebih lanjut &rarr;',
      'common.viewAllProducts': 'Lihat semua produk &rarr;',
      'common.viewClientStories': 'Lihat kisah klien',

      'home.eyebrow': 'Mitra Teknologi Ritel Tepercaya Anda &mdash; <span class="eyebrow-hl">Pengalaman yang Disesuaikan untuk Anda</span>',
      'home.h1a': 'Satu mitra untuk',
      'home.h1b': 'membangun, menghubungkan, dan menjalankan',
      'home.h1c': 'teknologi ritel Anda.',
      'home.lead': 'Kami adalah mitra unik Anda yang menjalankan dua peran sekaligus &mdash; system integrator yang menerapkan POS, CRM, inventaris dan analitik terbaik di kelasnya, dan perusahaan teknologi dengan berbagai platform AI serta lapisan integrasi yang cerdas, sehingga setiap sistem yang Anda jalankan bekerja sebagai satu kesatuan, bukan selusin sistem terpisah.',
      'home.exploreSolutions': 'Jelajahi Solusi',
      'home.floater1': 'Keamanan Setara Enterprise',
      'home.floater1Sub': 'Terintegrasi di setiap implementasi',
      'home.floater2': 'Dukungan Regional 24/7',
      'home.floater2Sub': 'Singapura &middot; Indonesia &middot; Thailand',
      'home.stat0': 'Tahun di bidang teknologi ritel',
      'home.stat1': 'Toko yang didukung',
      'home.stat2': 'Transaksi yang difasilitasi',
      'home.stat3': 'Integrasi enterprise',
      'home.stat4': 'Klien di seluruh APAC',

      'home.wwd.kicker': 'Apa yang Kami Lakukan',
      'home.wwd.h2a': 'Satu mitra,',
      'home.wwd.h2b': 'setiap lapisan',
      'home.wwd.h2c': 'operasi ritel',
      'home.wwd.p': 'Dari meja kasir hingga ruang rapat &mdash; kami merancang, menerapkan, dan mendukung sistem yang menjaga ritel omnichannel tetap berjalan, lalu menghubungkannya sehingga tim Anda berhenti merekonsiliasi spreadsheet.',
      'home.wwd.card1.title': 'Perangkat Lunak POS Ritel',
      'home.wwd.card1.desc': 'Pemenuhan omni-channel, desain segar, multi-mata uang, dan dapat diperluas.',
      'home.wwd.card2.title': 'E-Commerce',
      'home.wwd.card2.desc': 'Perdagangan web, mobile, dan sosial, terpadu dengan toko fisik Anda.',
      'home.wwd.card3.title': 'CRM &amp; Clienteling',
      'home.wwd.card3.desc': 'Profil pelanggan dan loyalitas terpadu di setiap kanal.',
      'home.wwd.card4.title': 'Manajemen Inventaris',
      'home.wwd.card4.desc': 'Satu tampilan stok yang skalabel di seluruh toko dan kanal penjualan.',
      'home.wwd.card5.title': 'Produktivitas Staf',
      'home.wwd.card5.desc': 'Analitik prediktif dan peringatan kontekstual di seluruh jaringan ritel.',
      'home.wwd.card6.title': 'Keterlibatan Konsumen',
      'home.wwd.card6.desc': 'Pesan yang konsisten dan terlacak di setiap titik sentuh.',
      'home.wwd.card7.title': 'Pelaporan &amp; Analitik',
      'home.wwd.card7.desc': 'Satu gambaran holistik bisnis Anda, di perangkat apa pun.',
      'home.wwd.card8.title': 'Integrasi Sistem',
      'home.wwd.card8.desc': 'Globriq menghubungkan POS, ERP, WMS, CRM, dan pemasok ke dalam satu jalur data yang terkelola.',
      'home.wwd.card9.title': 'Manajemen Gudang',
      'home.wwd.card9.desc': 'Kontrol stok secara real-time dari dok hingga rak, didukung oleh Warewiser.',
      'home.wwd.card10.title': 'Analitik Lalu Lintas &amp; Lokasi',
      'home.wwd.card10.desc': 'Sensor penghitung pengunjung yang mengutamakan privasi dan analitik lokasi, didukung oleh FootfallCam.',

      'home.platforms.kicker': 'Platform Kami',
      'home.platforms.h2a': '',
      'home.platforms.h2b': 'Produk',
      'home.platforms.h2c': 'di balik komitmen kami',
      'home.platforms.p': 'Perangkat lunak terbaik di kelasnya, platform AI internal, dan Globriq &mdash; lapisan integrasi kami yang menghubungkan semuanya &mdash; diterapkan dan didukung oleh tim kami di Singapura, Indonesia, dan Thailand.',
      'home.platforms.cegid.desc': 'POS cloud-native dan unified commerce untuk peritel khusus.',
      'home.platforms.retailpro.desc': 'Platform POS yang lebih ringan, lebih cepat, dan dapat disesuaikan sepenuhnya.',
      'home.platforms.footfallcam.desc': 'Sensor penghitung pengunjung yang mengutamakan privasi dan analitik lokasi untuk ROI yang lebih baik.',
      'home.platforms.iposit.desc': 'Ubah layar POS menjadi mesin rekomendasi bertenaga AI.',
      'home.platforms.ioptimo.desc': 'Optimalisasi stok berbasis AI &mdash; dari macet menjadi terjual.',
      'home.platforms.warewiser.desc': 'Manajemen gudang cerdas untuk peritel modern.',
      'home.platforms.retaillium.desc': 'Pusat komando ritel AI untuk operasi, perdagangan, dan pemasaran.',
      'home.platforms.globriq.desc': 'Platform integrasi yang menghubungkan setiap sistem di atas &mdash; dan semua yang akan Anda tambahkan berikutnya.',
      'home.platforms.seeAll.title': 'Lihat seluruh lineup',
      'home.platforms.seeAll.desc': 'Setiap platform yang kami jalankan, satu mitra integrasi.',

      'home.brands.kicker': 'Merek yang Kami Bantu',
      'home.brands.h2a': 'Jaringan toko yang berjalan di',
      'home.brands.h2b': 'sistem kami',
      'home.brands.p': 'Melalui Delamibrands, Everbest, dan peritel multi-merek yang kami dukung, sistem kami berada di balik 200+ gerai untuk nama-nama seperti ini di Indonesia, Thailand, dan Singapura.',

      'home.cta.h2a': 'Siap untuk',
      'home.cta.h2b': 'memodernisasi',
      'home.cta.h2c': 'operasi ritel Anda?',
      'home.cta.p': 'Jadwalkan konsultasi tanpa kewajiban dengan tim kami di Singapura, Indonesia, atau Thailand.'
    },

    th: {
      'nav.home': 'หน้าแรก',
      'nav.about': 'เกี่ยวกับเรา',
      'nav.solution': 'โซลูชันของเรา',
      'nav.product': 'ผลิตภัณฑ์',
      'nav.more': 'เพิ่มเติม',
      'nav.others': 'อื่นๆ',
      'nav.industries': 'อุตสาหกรรม',
      'nav.indFashion': 'แฟชั่นและเครื่องแต่งกาย',
      'nav.indHealth': 'สุขภาพและความงาม',
      'nav.indFnb': 'F&B',
      'nav.indMalls': 'ห้างสรรพสินค้า',
      'nav.indLuxury': 'ค้าปลีกหรูหรา',
      'nav.indGroceries': 'ร้านขายของชำ',
      'nav.indDept': 'ห้างสรรพสินค้าดีพาร์ทเมนท์',
      'nav.services': 'บริการ',
      'nav.svcSolutionDesign': 'ออกแบบโซลูชัน',
      'nav.svcProjectDelivery': 'การส่งมอบโครงการ',
      'nav.svcManagedServices': 'บริการดูแลระบบ',
      'nav.svcTraining': 'การฝึกอบรม',
      'nav.svcIntegration': 'การเชื่อมต่อระบบ',
      'nav.clients': 'ลูกค้า',
      'nav.resources': 'แหล่งข้อมูล',
      'nav.contact': 'ติดต่อเรา',
      'nav.knowledgeHub': 'ศูนย์ความรู้',
      'nav.helpdesk': 'ศูนย์ช่วยเหลือ',
      'nav.bookConsultation': 'นัดหมายที่ปรึกษา',
      'nav.aboutCompany': 'บริษัท',
      'nav.aboutValues': 'คุณค่าและวัฒนธรรม',
      'nav.aboutCareers': 'ร่วมงานกับเรา',
      'nav.aboutPartners': 'พันธมิตร',
      'nav.resCaseStudies': 'กรณีศึกษา',
      'nav.resBlog': 'บล็อก',
      'nav.resFaq': 'คำถามที่พบบ่อย',

      'footer.tagline': 'Integrated Retail &mdash; ระบบค้าปลีกที่ทันสมัยและเป็นหนึ่งเดียว สำหรับธุรกิจแฟชั่น ไลฟ์สไตล์ อาหารและเครื่องดื่ม และสินค้าอุปโภคบริโภคทั่วเอเชียแปซิฟิก จากพันธมิตรผู้เชื่อมต่อระบบและสร้างสรรค์เทคโนโลยี ได้แก่ POS, CRM, อีคอมเมิร์ซ, สินค้าคงคลัง, การวิเคราะห์ข้อมูล และ AI ให้ทำงานเป็นหนึ่งเดียว',
      'footer.company': 'บริษัท',
      'footer.resources': 'แหล่งข้อมูล',
      'footer.more': 'เพิ่มเติม',
      'footer.products': 'ผลิตภัณฑ์',
      'footer.offices': 'สำนักงาน',
      'footer.singapore': 'สิงคโปร์',
      'footer.indonesia': 'อินโดนีเซีย',
      'footer.thailand': 'ไทย',
      'footer.contactUs': 'ติดต่อเรา &rarr;',
      'footer.rights': '&copy; 2026 Integrated Retail Management Consulting Pte. Ltd. สงวนสิทธิ์ทุกประการ',
      'footer.trademarks': 'ชื่อผลิตภัณฑ์ โลโก้ และแบรนด์ของบุคคลที่สามทั้งหมดที่กล่าวถึงในเว็บไซต์นี้เป็นเครื่องหมายการค้าของเจ้าของแต่ละราย ใช้เพื่อระบุผลิตภัณฑ์ที่ติดตั้งและดูแลโดย Integrated Retail การใช้งานนี้ไม่ได้หมายความถึงการรับรองใดๆ',

      'common.bookFreeConsultation': 'นัดหมายที่ปรึกษาฟรี',
      'common.learnMore': 'ดูเพิ่มเติม &rarr;',
      'common.viewAllProducts': 'ดูผลิตภัณฑ์ทั้งหมด &rarr;',
      'common.viewClientStories': 'ดูเรื่องราวลูกค้า',

      'home.eyebrow': 'พันธมิตรด้านเทคโนโลยีค้าปลีกที่คุณเชื่อถือได้ &mdash; <span class="eyebrow-hl">ประสบการณ์ที่ออกแบบมาเพื่อคุณ</span>',
      'home.h1a': 'พันธมิตรเดียวที่',
      'home.h1b': 'สร้าง เชื่อมต่อ และดูแล',
      'home.h1c': 'เทคโนโลยีค้าปลีกของคุณ',
      'home.lead': 'เราเป็นพันธมิตรที่มีเอกลักษณ์เฉพาะตัวของคุณ ซึ่งทำหน้าที่ทั้งสองอย่าง คือผู้รวมระบบที่ติดตั้ง POS, CRM, ระบบคลังสินค้า และการวิเคราะห์ข้อมูลที่ดีที่สุดในตลาด และบริษัทเทคโนโลยีที่มีแพลตฟอร์ม AI หลากหลายและชั้นการเชื่อมต่อระบบอันชาญฉลาด เพื่อให้ทุกระบบที่คุณใช้ทำงานเป็นหนึ่งเดียว ไม่ใช่แยกกันเป็นสิบระบบ',
      'home.exploreSolutions': 'ดูโซลูชันของเรา',
      'home.floater1': 'ความปลอดภัยระดับองค์กร',
      'home.floater1Sub': 'ในทุกการติดตั้งระบบ',
      'home.floater2': 'ทีมสนับสนุนประจำภูมิภาคตลอดเวลา',
      'home.floater2Sub': 'สิงคโปร์ &middot; อินโดนีเซีย &middot; ไทย',
      'home.stat0': 'ปีแห่งประสบการณ์ด้านเทคโนโลยีค้าปลีก',
      'home.stat1': 'ร้านค้าที่รองรับ',
      'home.stat2': 'มูลค่าการค้าที่รองรับ',
      'home.stat3': 'การเชื่อมต่อระบบองค์กร',
      'home.stat4': 'ลูกค้าทั่วเอเชียแปซิฟิก',

      'home.wwd.kicker': 'สิ่งที่เราทำ',
      'home.wwd.h2a': 'พันธมิตรเดียว',
      'home.wwd.h2b': 'ทุกระดับ',
      'home.wwd.h2c': 'ของการดำเนินงานค้าปลีก',
      'home.wwd.p': 'จากหน้าเคาน์เตอร์จนถึงห้องประชุมผู้บริหาร &mdash; เราออกแบบ ติดตั้ง และดูแลระบบที่ทำให้การค้าปลีกแบบ omnichannel ดำเนินไปอย่างราบรื่น แล้วเชื่อมต่อระบบเหล่านั้นเข้าด้วยกัน เพื่อให้ทีมของคุณไม่ต้องมากระทบยอดสเปรดชีตอีกต่อไป',
      'home.wwd.card1.title': 'ซอฟต์แวร์ POS สำหรับค้าปลีก',
      'home.wwd.card1.desc': 'รองรับการขายทุกช่องทาง ดีไซน์ทันสมัย รองรับหลายสกุลเงิน และขยายต่อได้',
      'home.wwd.card2.title': 'อีคอมเมิร์ซ',
      'home.wwd.card2.desc': 'การค้าผ่านเว็บ มือถือ และโซเชียล เชื่อมต่อเป็นหนึ่งเดียวกับหน้าร้านจริง',
      'home.wwd.card3.title': 'CRM และ Clienteling',
      'home.wwd.card3.desc': 'โปรไฟล์ลูกค้าและความภักดีที่เชื่อมโยงกันทุกช่องทาง',
      'home.wwd.card4.title': 'การจัดการสินค้าคงคลัง',
      'home.wwd.card4.desc': 'มุมมองสต๊อกเดียวที่ขยายได้ ครอบคลุมทุกสาขาและทุกช่องทางขาย',
      'home.wwd.card5.title': 'ประสิทธิภาพของพนักงาน',
      'home.wwd.card5.desc': 'การวิเคราะห์เชิงพยากรณ์และการแจ้งเตือนตามสถานการณ์ทั่วทั้งเครือข่ายร้านค้า',
      'home.wwd.card6.title': 'การมีส่วนร่วมของผู้บริโภค',
      'home.wwd.card6.desc': 'ข้อความที่สอดคล้องและวัดผลได้ในทุกจุดสัมผัส',
      'home.wwd.card7.title': 'รายงานและการวิเคราะห์',
      'home.wwd.card7.desc': 'ภาพรวมธุรกิจของคุณแบบองค์รวม บนอุปกรณ์ใดก็ได้',
      'home.wwd.card8.title': 'การเชื่อมต่อระบบ',
      'home.wwd.card8.desc': 'Globriq เชื่อมต่อ POS, ERP, WMS, CRM และซัพพลายเออร์เข้าไว้ในไปป์ไลน์เดียวที่มีการกำกับดูแล',
      'home.wwd.card9.title': 'การจัดการคลังสินค้า',
      'home.wwd.card9.desc': 'ควบคุมสต๊อกแบบเรียลไทม์ตั้งแต่ท่าขนถึงชั้นวาง ขับเคลื่อนโดย Warewiser',
      'home.wwd.card10.title': 'การวิเคราะห์ทราฟฟิกและตำแหน่งที่ตั้ง',
      'home.wwd.card10.desc': 'เซ็นเซอร์นับจำนวนผู้คนที่ให้ความสำคัญกับความเป็นส่วนตัวและการวิเคราะห์ตำแหน่งที่ตั้ง ขับเคลื่อนโดย FootfallCam',

      'home.platforms.kicker': 'แพลตฟอร์มของเรา',
      'home.platforms.h2a': '',
      'home.platforms.h2b': 'ผลิตภัณฑ์',
      'home.platforms.h2c': 'ที่อยู่เบื้องหลังคำมั่นสัญญาของเรา',
      'home.platforms.p': 'ซอฟต์แวร์ที่ดีที่สุดในตลาด แพลตฟอร์ม AI ที่พัฒนาเอง และ Globriq &mdash; ชั้นการเชื่อมต่อระบบที่รวมทุกอย่างเข้าด้วยกัน &mdash; ติดตั้งและดูแลโดยทีมของเราทั่วสิงคโปร์ อินโดนีเซีย และไทย',
      'home.platforms.cegid.desc': 'POS แบบ cloud-native และ unified commerce สำหรับร้านค้าเฉพาะทาง',
      'home.platforms.retailpro.desc': 'แพลตฟอร์ม POS ที่เบา เร็ว และปรับแต่งได้อย่างเต็มที่',
      'home.platforms.footfallcam.desc': 'เซ็นเซอร์นับผู้เข้าร้านที่คำนึงถึงความเป็นส่วนตัวและวิเคราะห์ทำเลเพื่อ ROI ที่ดีขึ้น',
      'home.platforms.iposit.desc': 'เปลี่ยนหน้าจอ POS ให้เป็นเครื่องมือแนะนำสินค้าด้วย AI',
      'home.platforms.ioptimo.desc': 'การบริหารสต๊อกด้วย AI &mdash; จากสินค้าค้างสต๊อกสู่การขายได้จริง',
      'home.platforms.warewiser.desc': 'การจัดการคลังสินค้าอัจฉริยะสำหรับผู้ค้าปลีกยุคใหม่',
      'home.platforms.retaillium.desc': 'ศูนย์บัญชาการค้าปลีกด้วย AI สำหรับการปฏิบัติงาน การค้า และการตลาด',
      'home.platforms.globriq.desc': 'แพลตฟอร์มเชื่อมต่อระบบที่รวมทุกระบบข้างต้นไว้ด้วยกัน &mdash; และทุกระบบที่คุณจะเพิ่มในอนาคต',
      'home.platforms.seeAll.title': 'ดูผลิตภัณฑ์ทั้งหมด',
      'home.platforms.seeAll.desc': 'ทุกแพลตฟอร์มที่เราดูแล พันธมิตรด้านการเชื่อมต่อระบบเพียงหนึ่งเดียว',

      'home.brands.kicker': 'แบรนด์ที่เราช่วยดูแล',
      'home.brands.h2a': 'เครือข่ายร้านค้าที่ทำงานบน',
      'home.brands.h2b': 'ระบบของเรา',
      'home.brands.p': 'ผ่าน Delamibrands, Everbest และผู้ค้าปลีกหลายแบรนด์ที่เราดูแล ระบบของเราอยู่เบื้องหลังร้านค้ากว่า 200 สาขาของแบรนด์เหล่านี้ทั่วอินโดนีเซีย ไทย และสิงคโปร์',

      'home.cta.h2a': 'พร้อมที่จะ',
      'home.cta.h2b': 'ยกระดับ',
      'home.cta.h2c': 'การดำเนินงานค้าปลีกของคุณแล้วหรือยัง',
      'home.cta.p': 'นัดหมายที่ปรึกษาฟรีโดยไม่มีข้อผูกมัดกับทีมของเราในสิงคโปร์ อินโดนีเซีย หรือไทย'
    }
  };

  var LANG_LABELS = { en: 'EN', id: 'ID', th: 'TH' };

  function getSavedLang() {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
    } catch (e) {
      return DEFAULT_LANG;
    }
  }

  function saveLang(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
  }

  function captureOriginals() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      if (el.dataset.i18nOriginal === undefined) {
        el.dataset.i18nOriginal = el.innerHTML;
      }
    });
  }

  function applyLang(lang) {
    var dict = DICT[lang];
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (lang === DEFAULT_LANG || !dict) {
        el.innerHTML = el.dataset.i18nOriginal;
        return;
      }
      if (Object.prototype.hasOwnProperty.call(dict, key)) {
        el.innerHTML = dict[key];
      } else {
        // No translation yet for this element on this page - fall back to
        // English rather than showing a raw key or blank text.
        el.innerHTML = el.dataset.i18nOriginal;
      }
    });
    document.documentElement.setAttribute('lang', lang);
    document.querySelectorAll('.lang-current').forEach(function (el) {
      el.textContent = LANG_LABELS[lang] || lang.toUpperCase();
    });
    document.querySelectorAll('.lang-option').forEach(function (el) {
      el.classList.toggle('is-active', el.getAttribute('data-lang') === lang);
    });
  }

  function init() {
    captureOriginals();
    var lang = getSavedLang();
    applyLang(lang);

    document.querySelectorAll('.lang-option').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var lang = el.getAttribute('data-lang');
        saveLang(lang);
        applyLang(lang);
        // Close any open mobile dropdown after picking a language
        var item = el.closest('.nav-item.has-dropdown');
        if (item) { item.classList.remove('open'); }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
