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
    birth_year: '2540',
    email: 'manasavee@example.com' // <-- เพิ่มอีเมลของคุณตรงนี้
  }
};

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("🚀 เริ่มต้นบอทไฮสปีด (V.Turbo-Final-Email)...");
  await page.goto(CONFIG.TARGET_URL);

  try {
    // 1-3: ผ่านหน้าเงื่อนไขและการเลือกวันที่
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

    // --- สเต็ป 4: วาร์ปกรอกข้อมูลส่วนตัว ---
    console.log("⚡️ วาร์ปไปที่ฟอร์มและกรอกข้อมูล...");
    await page.evaluate(() => {
      const el = document.querySelector('.lg\\:col-span-2') || document.querySelector('input[id="ชื่อ"]');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    });

    const prefixBox = page.locator('div.border-2.cursor-pointer').first();
    await page.evaluate((el) => el.click(), await prefixBox.elementHandle());
    await page.locator(`div:text-is("${CONFIG.PAYLOAD.prefix}")`).last().click({ force: true });

    await page.fill('input[id="ชื่อ"]', CONFIG.PAYLOAD.first_name);
    await page.fill('input[id="นามสกุล"]', CONFIG.PAYLOAD.last_name);
    await page.fill('input[id="เลขบัตรประชาชน"]', CONFIG.PAYLOAD.nid);
    await page.fill('input[id="เบอร์โทรศัพท์"]', CONFIG.PAYLOAD.tel);

    // 📅 จัดการปฏิทิน
    const birthInput = page.locator('div:has-text("วันเกิด (ปี พ.ศ.)") + div').first();
    await page.evaluate((el) => el.click(), await birthInput.elementHandle());
    const activeCalendar = page.locator('.react-calendar:visible');
    const navLabel = activeCalendar.locator('.react-calendar__navigation__label');
    await page.evaluate((el) => el.click(), await navLabel.elementHandle());
    await page.evaluate((el) => el.click(), await navLabel.elementHandle());

    let yearFound = false;
    for (let i = 0; i < 50; i++) {
      const yearButtons = activeCalendar.locator('.react-calendar__decade-view__years__year');
      const yearsOnScreen = await yearButtons.allInnerTexts();
      const foundIndex = yearsOnScreen.findIndex(y => y.includes(CONFIG.PAYLOAD.birth_year));
      if (foundIndex !== -1) {
        await page.evaluate((el) => el.click(), await yearButtons.nth(foundIndex).elementHandle());
        yearFound = true;
        break;
      } else {
        await page.evaluate((el) => el.click(), await activeCalendar.locator('.react-calendar__navigation__prev-button').elementHandle());
        await page.waitForTimeout(150);
      }
    }

    if (yearFound) {
      const monthTarget = CONFIG.PAYLOAD.birth_month.substring(0, 3);
      await page.evaluate((el) => el.click(), await activeCalendar.locator('.react-calendar__year-view__months__month').filter({ hasText: new RegExp(monthTarget) }).first().elementHandle());
      await page.waitForTimeout(150);
      await page.evaluate((el) => el.click(), await activeCalendar.locator('.react-calendar__month-view__days__day:not(.react-calendar__month-view__days__day--neighboringMonth)').filter({ hasText: new RegExp(`^${CONFIG.PAYLOAD.birth_day}$`) }).first().elementHandle());
    }

    await page.setInputFiles('input[type="file"]', CONFIG.IMAGE_PATH);
    await page.waitForTimeout(500);
    await page.locator('button:has-text("ตรวจสอบ")').click();

    // ➡️ กดถัดไป รอบที่ 1
    const nextBtn1 = page.locator('button:has-text("ถัดไป"):visible').last();
    await nextBtn1.waitFor({ state: 'visible', timeout: 5000 });
    await page.evaluate((el) => el.click(), await nextBtn1.elementHandle());

    // ➡️ กดถัดไป รอบที่ 2 (หน้าเลือกบริการ)
    const nextBtn2 = page.locator('button:has-text("ถัดไป"):visible').last();
    await nextBtn2.waitFor({ state: 'visible', timeout: 5000 });
    await page.evaluate((el) => el.click(), await nextBtn2.elementHandle());

    // --- สเต็ปสุดท้าย: กรอกอีเมล และ ติ๊กเงื่อนไข ---
    console.log("🤖 หน้าสรุป: กำลังกรอกอีเมลและติ๊กเงื่อนไข...");

    // 1. กรอกอีเมล
    const emailInput = page.locator('input[placeholder="กรอกอีเมล"]');
    await emailInput.waitFor({ state: 'visible' });
    await emailInput.fill(CONFIG.PAYLOAD.email);

    // 2. ติ๊กถูกยอมรับเงื่อนไข (แก้ปัญหา Clicking did not change state)
    const conditionCheck = page.locator('#flexCheckDefault6');
    await page.evaluate((el) => {
      if (!el.checked) el.click(); // สั่งคลิกโดยตรงผ่าน Browser
    }, await conditionCheck.elementHandle());

    // 3. วาร์ปไปที่ CAPTCHA
    await page.evaluate(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    });

    console.log("✅ พร้อมแล้ว! กรุณาแก้ CAPTCHA ด้วยตนเอง");

    // แจ้งเตือนเพื่อให้คุณรู้ตัวทันที
    await page.evaluate(() => {
      alert("บอทกรอกอีเมลและติ๊กเงื่อนไขให้แล้ว! แก้ CAPTCHA แล้วกดยืนยันได้เลย!");
    });

  } catch (e) {
    console.error("❌ หลุดการทำงาน:", e.message);
  }
})();