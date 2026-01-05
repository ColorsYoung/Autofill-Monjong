const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const path = require('path');

chromium.use(stealth());

const CONFIG = {
  TARGET_URL: 'https://wildlifesanctuaryfca16.com/omkoi/reservation',
  IMAGE_PATH: path.join(__dirname, 'id_card.jpg'),
  PAYLOAD: {
    prefix: 'นาย',
    first_name: 'มนัสวี',
    last_name: 'เจริญราษฏร์',
    tel: '0957342645',
    nid: '1330453153454',
    birth_day: '2',
    birth_month: 'พฤษภาคม',
    birth_year: '2540'
  }
};

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("🚀 เริ่มต้นบอท (V.Final-Keyboard-Native)...");
  await page.goto(CONFIG.TARGET_URL);

  try {
    // 1-3: ผ่านหน้าเงื่อนไข
    await page.waitForSelector('input[type="checkbox"]');
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("ถัดไป")');

    await page.waitForSelector('label[for="flexCheckDefault2"]');
    await page.click('label[for="flexCheckDefault2"]');
    await page.locator('button:has-text("ถัดไป"):visible').last().click();

    await page.waitForSelector('#flexCheckDefault3');
    await page.click('#flexCheckDefault3');
    await page.locator('.react-calendar__month-view__days__day:not(.react-calendar__month-view__days__day--neighboringMonth)').filter({ hasText: /^12$/ }).first().click();
    await page.locator('button:has-text("ถัดไป"):visible').last().click();

    try { await page.locator('button:has-text("ยอมรับ"), button:has-text("ตกลง")').last().click({ timeout: 1500 }); } catch (e) { }

    // 4️⃣ กรอกข้อมูลส่วนตัว
    console.log("⚡️ กำลังกรอกข้อมูล...");

    // เลือกคำนำหน้า (แก้ไขตามรูป image_a791ee.jpg)
    const prefixBox = page.locator('div.border-2.cursor-pointer').first();
    await prefixBox.click();
    await page.waitForTimeout(300);
    await page.locator(`div:text-is("${CONFIG.PAYLOAD.prefix}")`).last().click();

    await page.fill('input[id="ชื่อ"]', CONFIG.PAYLOAD.first_name);
    await page.fill('input[id="นามสกุล"]', CONFIG.PAYLOAD.last_name);
    await page.fill('input[id="เลขบัตรประชาชน"]', CONFIG.PAYLOAD.nid);
    await page.fill('input[id="เบอร์โทรศัพท์"]', CONFIG.PAYLOAD.tel);

    // 📅 จัดการปฏิทินวันเกิด
    console.log("📅 เริ่มต้นขั้นตอนวันเกิด...");
    const birthInput = page.locator('div:has-text("วันเกิด (ปี พ.ศ.)") + div').first();
    await birthInput.click();

    // ระบุปฏิทินตัวที่โผล่มาใหม่ล่าสุด (Visible) เพื่อเลี่ยง Strict Mode
    const activeCalendar = page.locator('.react-calendar:visible');

    // ฟังก์ชันช่วยคลิกเพื่อให้ UI ตอบสนองแน่นอน (ใช้ Native Click)
    const forceClick = async (locator) => {
      await locator.scrollIntoViewIfNeeded();
      await page.evaluate((el) => el.click(), await locator.elementHandle());
      await page.waitForTimeout(600);
    };

    // 1. กดป้ายชื่อเดือน/ปี 2 ครั้งเพื่อถอยไปโหมดทศวรรษ
    const navLabel = activeCalendar.locator('.react-calendar__navigation__label');
    await forceClick(navLabel);
    await forceClick(navLabel);

    let yearFound = false;
    // วนลูปสูงสุด 50 รอบ เพราะถอยทีละปี
    for (let i = 0; i < 50; i++) {
      const yearButtons = activeCalendar.locator('.react-calendar__decade-view__years__year');
      const yearsOnScreen = await yearButtons.allInnerTexts();

      console.log(`🔍 ช่วงปีที่เห็น: ${yearsOnScreen.join(', ')}`);

      const foundIndex = yearsOnScreen.findIndex(y => y.includes(CONFIG.PAYLOAD.birth_year));

      if (foundIndex !== -1) {
        console.log(`✨ เจอปี ${CONFIG.PAYLOAD.birth_year} แล้ว!`);
        await forceClick(yearButtons.nth(foundIndex));
        yearFound = true;
        break;
      } else {
        // ใช้ปุ่ม < (prev-button) แทน << ตามภาพ image_a7fa4c.jpg
        console.log(`⏭️ กดถอยหลัง (‹) ครั้งที่ ${i + 1}...`);
        const prevBtn = activeCalendar.locator('.react-calendar__navigation__prev-button');
        await forceClick(prevBtn);
      }
    }

    if (!yearFound) throw new Error("ไม่พบปีที่ต้องการ");

    // เลือกเดือน (substring 3 ตัวแรก)
    const monthTarget = CONFIG.PAYLOAD.birth_month.substring(0, 3);
    const monthBtn = activeCalendar.locator('.react-calendar__year-view__months__month').filter({ hasText: new RegExp(monthTarget) }).first();
    await forceClick(monthBtn);

    // เลือกวันที่ (แมตช์ตัวเลขเป๊ะๆ)
    const dayBtn = activeCalendar.locator('.react-calendar__month-view__days__day:not(.react-calendar__month-view__days__day--neighboringMonth)')
      .filter({ hasText: new RegExp(`^${CONFIG.PAYLOAD.birth_day}$`) }).first();
    await forceClick(dayBtn);

    console.log("✅ จบขั้นตอนเลือกวันเกิดสำเร็จ!");

    // อัปโหลดและตรวจสอบ
    await page.setInputFiles('input[type="file"]', CONFIG.IMAGE_PATH);
    await page.waitForTimeout(1000);
    await page.locator('button:has-text("ตรวจสอบ")').click();
    console.log("🚀 บอททำงานเสร็จสิ้น!");

  } catch (e) {
    console.error("❌ หลุดการทำงาน:", e.message);
  }
})();