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

  console.log("🚀 เริ่มต้นบอทไฮสปีด (V.Turbo-Fix)...");
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

    try { await page.locator('button:has-text("ยอมรับ"), button:has-text("ตกลง")').last().click({ timeout: 1000 }); } catch (e) { }

    // --- สเต็ป 4: แก้ปัญหาหน้าเด้งและกรอกข้อมูลทันที ---
    console.log("⚡️ วาร์ปไปที่ฟอร์มและกรอกข้อมูล...");

    // บังคับหน้าจอให้หยุดอยู่ที่ฟอร์มทันที (ใช้ Selector มาตรฐาน CSS)
    await page.evaluate(() => {
      // ค้นหา Element จากชื่อคลาสที่ระบุในรูปภาพ
      const formElement = document.querySelector('.lg\\:col-span-2') || document.querySelector('input[id="ชื่อ"]');
      if (formElement) formElement.scrollIntoView({ behavior: 'instant', block: 'start' });
    });

    // เลือกคำนำหน้า (JS Click)
    const prefixBox = page.locator('div.border-2.cursor-pointer').first();
    await page.evaluate((el) => el.click(), await prefixBox.elementHandle());
    await page.locator(`div:text-is("${CONFIG.PAYLOAD.prefix}")`).last().click({ force: true });

    // กรอกข้อมูลหลัก
    await page.fill('input[id="ชื่อ"]', CONFIG.PAYLOAD.first_name);
    await page.fill('input[id="นามสกุล"]', CONFIG.PAYLOAD.last_name);
    await page.fill('input[id="เลขบัตรประชาชน"]', CONFIG.PAYLOAD.nid);
    await page.fill('input[id="เบอร์โทรศัพท์"]', CONFIG.PAYLOAD.tel);

    // 📅 จัดการปฏิทินวันเกิด
    console.log("📅 จัดการปฏิทินด้วยความเร็วสูง...");
    const birthInput = page.locator('div:has-text("วันเกิด (ปี พ.ศ.)") + div').first();
    await page.evaluate((el) => el.click(), await birthInput.elementHandle());

    const activeCalendar = page.locator('.react-calendar:visible');
    const navLabel = activeCalendar.locator('.react-calendar__navigation__label');

    // เข้าโหมดทศวรรษ (JS Click)
    await page.evaluate((el) => el.click(), await navLabel.elementHandle());
    await page.evaluate((el) => el.click(), await navLabel.elementHandle());

    let yearFound = false;
    for (let i = 0; i < 50; i++) {
      const yearButtons = activeCalendar.locator('.react-calendar__decade-view__years__year');
      const yearsOnScreen = await yearButtons.allInnerTexts();

      const foundIndex = yearsOnScreen.findIndex(y => y.includes(CONFIG.PAYLOAD.birth_year));

      if (foundIndex !== -1) {
        console.log(`✨ เจอปี ${CONFIG.PAYLOAD.birth_year} แล้ว!`);
        await page.evaluate((el) => el.click(), await yearButtons.nth(foundIndex).elementHandle());
        yearFound = true;
        break;
      } else {
        // ถอยหลังทันที (ลด Timeout เหลือ 150ms เพื่อความไวสูงสุด)
        const prevBtn = activeCalendar.locator('.react-calendar__navigation__prev-button');
        await page.evaluate((el) => el.click(), await prevBtn.elementHandle());
        await page.waitForTimeout(150);
      }
    }

    if (yearFound) {
      const monthTarget = CONFIG.PAYLOAD.birth_month.substring(0, 3);
      const monthBtn = activeCalendar.locator('.react-calendar__year-view__months__month').filter({ hasText: new RegExp(monthTarget) }).first();
      await page.evaluate((el) => el.click(), await monthBtn.elementHandle());
      await page.waitForTimeout(150);

      const dayBtn = activeCalendar.locator('.react-calendar__month-view__days__day:not(.react-calendar__month-view__days__day--neighboringMonth)').filter({ hasText: new RegExp(`^${CONFIG.PAYLOAD.birth_day}$`) }).first();
      await page.evaluate((el) => el.click(), await dayBtn.elementHandle());
    }

    console.log("✅ กรอกข้อมูลสำเร็จ!");

    // อัปโหลดและกดตรวจสอบ
    await page.setInputFiles('input[type="file"]', CONFIG.IMAGE_PATH);
    await page.waitForTimeout(500);
    await page.locator('button:has-text("ตรวจสอบ")').click();
    console.log("🚀 บอททำงานเสร็จสิ้น!");

  } catch (e) {
    console.error("❌ หลุดการทำงาน:", e.message);
  }
})();