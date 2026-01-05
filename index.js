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
    email: 'manasavee@example.com'
  }
};

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("🚀 เริ่มต้นบอทไฮสปีด (V.PureJS-NoScroll)...");
  await page.goto(CONFIG.TARGET_URL);

  try {
    // --- สเต็ป 1: หน้าเงื่อนไขแรก (ใช้ JS ค้นหาปุ่มจาก Text) ---
    await page.waitForSelector('input[type="checkbox"]');
    await page.evaluate(() => {
      const checkbox = document.querySelector('input[type="checkbox"]');
      if (checkbox) checkbox.click();

      // ค้นหาปุ่มที่มีคำว่า "ถัดไป"
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(b => b.innerText.includes('ถัดไป'));
      if (nextBtn) nextBtn.click();
    });
    console.log("✅ ผ่านสเต็ป 1 (Instant)");

    // --- สเต็ป 2: หน้าวิธีลงทะเบียน ---
    await page.waitForSelector('label[for="flexCheckDefault2"]', { timeout: 5000 });
    await page.evaluate(() => {
      const checkbox2 = document.querySelector('#flexCheckDefault2') || document.querySelector('label[for="flexCheckDefault2"]');
      if (checkbox2) checkbox2.click();

      const buttons = Array.from(document.querySelectorAll('button'));
      // หาปุ่ม "ถัดไป" ที่แสดงผลอยู่ (Visible)
      const nextBtn2 = buttons.find(b => b.innerText.includes('ถัดไป') && b.offsetHeight > 0);
      if (nextBtn2) nextBtn2.click();
    });
    console.log("✅ ผ่านสเต็ป 2 (Instant)");

    // --- สเต็ป 3: เลือกวันที่ (ใช้แบบปกติที่คุณมั่นใจ) ---
    await page.waitForSelector('#flexCheckDefault3');
    await page.click('#flexCheckDefault3');
    await page.locator('.react-calendar__month-view__days__day:not(.react-calendar__month-view__days__day--neighboringMonth)').filter({ hasText: /^12$/ }).first().click();
    await page.locator('button:has-text("ถัดไป"):visible').last().click();

    try { await page.locator('button:has-text("ยอมรับ"), button:has-text("ตกลง")').last().click({ timeout: 1000 }); } catch (e) { }

    // --- สเต็ป 4: ข้อมูลส่วนตัว ---
    console.log("⚡️ กรอกข้อมูลส่วนตัว...");
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

    // 📅 ปฏิทินวันเกิด
    const birthInput = page.locator('div:has-text("วันเกิด (ปี พ.ศ.)") + div').first();
    await page.evaluate((el) => el.click(), await birthInput.elementHandle());

    const activeCalendar = page.locator('.react-calendar:visible');
    const navLabel = activeCalendar.locator('.react-calendar__navigation__label');
    await page.evaluate((el) => el.click(), await navLabel.elementHandle());
    await page.waitForTimeout(400);
    await page.evaluate((el) => el.click(), await navLabel.elementHandle());
    await page.waitForTimeout(500);

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
        const prevBtn = activeCalendar.locator('.react-calendar__navigation__prev-button');
        await page.evaluate((el) => el.click(), await prevBtn.elementHandle());
        await page.waitForTimeout(150);
      }
    }

    if (yearFound) {
      const monthTarget = CONFIG.PAYLOAD.birth_month.substring(0, 3);
      const monthBtn = activeCalendar.locator('.react-calendar__year-view__months__month').filter({ hasText: new RegExp(monthTarget) }).first();
      await page.waitForSelector('.react-calendar__year-view__months__month', { state: 'visible' });
      await page.evaluate((el) => el.click(), await monthBtn.elementHandle());
      await page.waitForTimeout(200);
      const dayBtn = activeCalendar.locator('.react-calendar__month-view__days__day:not(.react-calendar__month-view__days__day--neighboringMonth)')
        .filter({ hasText: new RegExp(`^${CONFIG.PAYLOAD.birth_day}$`) }).first();
      await page.evaluate((el) => el.click(), await dayBtn.elementHandle());
    }

    await page.setInputFiles('input[type="file"]', CONFIG.IMAGE_PATH);
    await page.waitForTimeout(500);
    await page.locator('button:has-text("ตรวจสอบ")').click();

    // กดถัดไป 2 รอบ
    const nextBtn1 = page.locator('button:has-text("ถัดไป"):visible').last();
    await nextBtn1.waitFor({ state: 'visible' });
    await page.evaluate((el) => el.click(), await nextBtn1.elementHandle());

    const nextBtn2 = page.locator('button:has-text("ถัดไป"):visible').last();
    await nextBtn2.waitFor({ state: 'visible' });
    await page.evaluate((el) => el.click(), await nextBtn2.elementHandle());

    // --- หน้าสุดท้าย ---
    const emailInput = page.locator('input[placeholder="กรอกอีเมล"]');
    await emailInput.waitFor({ state: 'visible' });
    await emailInput.fill(CONFIG.PAYLOAD.email);

    const conditionCheck = page.locator('#flexCheckDefault6');
    await page.evaluate((el) => { if (!el.checked) el.click(); }, await conditionCheck.elementHandle());

    await page.evaluate(() => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }); });

    console.log("✅ จบสเต็ปบอท! เตรียมแก้ CAPTCHA");
    await page.evaluate(() => { alert("บอททำสเต็ปสุดท้ายเสร็จแล้ว! รีบแก้ CAPTCHA แล้วกดยืนยันเลย!"); });

  } catch (e) {
    console.error("❌ หลุดการทำงาน:", e.message);
  }
})();